require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { IAMClient, CreateRoleCommand, GetRoleCommand, AttachRolePolicyCommand } = require('@aws-sdk/client-iam');
const {
  LambdaClient,
  CreateFunctionCommand,
  GetFunctionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  AddPermissionCommand
} = require('@aws-sdk/client-lambda');
const {
  ApiGatewayV2Client,
  CreateApiCommand,
  GetApisCommand,
  CreateIntegrationCommand,
  GetIntegrationsCommand,
  CreateRouteCommand,
  GetRoutesCommand,
  CreateStageCommand,
  GetStagesCommand
} = require('@aws-sdk/client-apigatewayv2');

const REGION = process.env.AWS_REGION || 'us-east-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

const iam = new IAMClient({ region: REGION, credentials });
const lambda = new LambdaClient({ region: REGION, credentials });
const apigw = new ApiGatewayV2Client({ region: REGION, credentials });

const ROLE_NAME = 'kbz-marcomms-lambda-execution-role';
const FUNCTION_NAME = 'kbz-marcomms-creative-hub-api';
const API_NAME = 'kbz-marcomms-http-api';

const trustPolicy = JSON.stringify({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { Service: 'lambda.amazonaws.com' },
      Action: 'sts:AssumeRole'
    }
  ]
});

async function ensureIamRole() {
  console.log(`[IAM] Checking IAM Role: ${ROLE_NAME}...`);
  try {
    const res = await iam.send(new GetRoleCommand({ RoleName: ROLE_NAME }));
    console.log(`[IAM] Role already exists: ${res.Role.Arn}`);
    return res.Role.Arn;
  } catch (err) {
    if (err.name === 'NoSuchEntityException' || err.name === 'NoSuchEntity') {
      console.log(`[IAM] Creating role ${ROLE_NAME}...`);
      const createRes = await iam.send(
        new CreateRoleCommand({
          RoleName: ROLE_NAME,
          AssumeRolePolicyDocument: trustPolicy,
          Description: 'Execution role for KBZ Marcomms Creative Hub Backend API Lambda'
        })
      );

      // Attach AWSLambdaBasicExecutionRole and AmazonS3FullAccess
      await iam.send(
        new AttachRolePolicyCommand({
          RoleName: ROLE_NAME,
          PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        })
      );
      await iam.send(
        new AttachRolePolicyCommand({
          RoleName: ROLE_NAME,
          PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess'
        })
      );

      console.log(`[IAM] Role created. Waiting 10s for IAM propagation...`);
      await new Promise((r) => setTimeout(r, 10000));
      return createRes.Role.Arn;
    }
    throw err;
  }
}

async function createZipBundle() {
  const distDir = path.join(__dirname, '../dist');
  const zipPath = path.join(distDir, 'lambda.zip');
  fs.mkdirSync(distDir, { recursive: true });
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  console.log(`[Bundle] Creating zip package using native zip...`);
  const backendDir = path.join(__dirname, '..');
  execSync(`zip -q -r "${zipPath}" src package.json node_modules`, {
    cwd: backendDir
  });

  const stats = fs.statSync(zipPath);
  console.log(`[Bundle] Package created (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  return fs.readFileSync(zipPath);
}

async function deployLambda(roleArn, zipBuffer) {
  console.log(`[Lambda] Checking Lambda function: ${FUNCTION_NAME}...`);
  const envVars = {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET || 'kbz_marcomms_creative_hub_jwt_super_secret_key_2026!',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    NODE_ENV: 'production',
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'kbz-marcomms-backups-888725256922',
    REMINDER_FROM_EMAIL: process.env.REMINDER_FROM_EMAIL || 'no-reply@marcomms.kbzpay.com',
    RESEND_API_KEY: process.env.RESEND_API_KEY || ''
  };

  try {
    const fn = await lambda.send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }));
    console.log(`[Lambda] Function exists. Updating code and configuration...`);
    await lambda.send(
      new UpdateFunctionCodeCommand({
        FunctionName: FUNCTION_NAME,
        ZipFile: zipBuffer
      })
    );

    // Wait 4s for code update before config
    await new Promise((r) => setTimeout(r, 4000));

    await lambda.send(
      new UpdateFunctionConfigurationCommand({
        FunctionName: FUNCTION_NAME,
        Runtime: 'nodejs20.x',
        Handler: 'src/lambda.handler',
        Timeout: 30,
        MemorySize: 512,
        Environment: { Variables: envVars }
      })
    );

    return fn.Configuration.FunctionArn;
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      console.log(`[Lambda] Creating new Lambda function: ${FUNCTION_NAME}...`);
      const createRes = await lambda.send(
        new CreateFunctionCommand({
          FunctionName: FUNCTION_NAME,
          Runtime: 'nodejs20.x',
          Role: roleArn,
          Handler: 'src/lambda.handler',
          Code: { ZipFile: zipBuffer },
          Timeout: 30,
          MemorySize: 512,
          Environment: { Variables: envVars },
          Description: 'KBZ Marcomms Creative Subscription Hub API'
        })
      );
      return createRes.FunctionArn;
    }
    throw err;
  }
}

async function setupApiGateway(functionArn) {
  console.log(`[API Gateway] Setting up HTTP API: ${API_NAME}...`);

  // 1. Get or Create HTTP API
  const apis = await apigw.send(new GetApisCommand({}));
  let api = (apis.Items || []).find((a) => a.Name === API_NAME);

  if (!api) {
    console.log(`[API Gateway] Creating API...`);
    api = await apigw.send(
      new CreateApiCommand({
        Name: API_NAME,
        ProtocolType: 'HTTP',
        Description: 'HTTP API Gateway for KBZ Marcomms Creative Hub Backend',
        CorsConfiguration: {
          AllowOrigins: ['*'],
          AllowMethods: ['*'],
          AllowHeaders: ['*']
        }
      })
    );
  }

  const apiId = api.ApiId;
  console.log(`[API Gateway] API ID: ${apiId}`);

  // 2. Get or Create Lambda Integration
  const integrations = await apigw.send(new GetIntegrationsCommand({ ApiId: apiId }));
  let integration = (integrations.Items || []).find(
    (i) => i.IntegrationUri === functionArn
  );

  if (!integration) {
    console.log(`[API Gateway] Creating Lambda Proxy Integration...`);
    integration = await apigw.send(
      new CreateIntegrationCommand({
        ApiId: apiId,
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: functionArn,
        PayloadFormatVersion: '2.0',
        Description: 'Lambda proxy integration'
      })
    );
  }

  const integrationId = integration.IntegrationId;

  // 3. Get or Create $default Catch-all Route
  const routes = await apigw.send(new GetRoutesCommand({ ApiId: apiId }));
  let defaultRoute = (routes.Items || []).find((r) => r.RouteKey === '$default');

  if (!defaultRoute) {
    console.log(`[API Gateway] Creating $default catch-all route...`);
    await apigw.send(
      new CreateRouteCommand({
        ApiId: apiId,
        RouteKey: '$default',
        Target: `integrations/${integrationId}`
      })
    );
  }

  // 4. Get or Create $default Stage
  const stages = await apigw.send(new GetStagesCommand({ ApiId: apiId }));
  let defaultStage = (stages.Items || []).find((s) => s.StageName === '$default');

  if (!defaultStage) {
    console.log(`[API Gateway] Creating $default auto-deploy stage...`);
    await apigw.send(
      new CreateStageCommand({
        ApiId: apiId,
        StageName: '$default',
        AutoDeploy: true
      })
    );
  }

  // 5. Grant API Gateway permission to invoke Lambda
  try {
    await lambda.send(
      new AddPermissionCommand({
        FunctionName: FUNCTION_NAME,
        StatementId: `apigw-access-${apiId}`,
        Action: 'lambda:InvokeFunction',
        Principal: 'apigateway.amazonaws.com',
        SourceArn: `arn:aws:execute-api:${REGION}:*:${apiId}/*/*`
      })
    );
    console.log(`[Lambda] Added invoke permission for API Gateway.`);
  } catch (err) {
    if (err.name !== 'ResourceConflictException') {
      console.warn(`[Lambda Permission Notice]`, err.message);
    }
  }

  return api.ApiEndpoint || `https://${apiId}.execute-api.${REGION}.amazonaws.com`;
}

async function main() {
  console.log(`\n=================================================`);
  console.log(`🚀 Deploying KBZ Marcomms Backend to AWS Serverless`);
  console.log(`🌍 Region: ${REGION}`);
  console.log(`=================================================\n`);

  try {
    const roleArn = await ensureIamRole();
    const zipBuffer = await createZipBundle();
    const functionArn = await deployLambda(roleArn, zipBuffer);
    const endpointUrl = await setupApiGateway(functionArn);

    console.log(`\n=================================================`);
    console.log(`✅ DEPLOYMENT SUCCESSFUL!`);
    console.log(`📡 AWS API Gateway URL: ${endpointUrl}`);
    console.log(`🏥 Health Check:        ${endpointUrl}/health`);
    console.log(`📦 S3 Backup Bucket:    kbz-marcomms-backups-888725256922`);
    console.log(`=================================================\n`);
  } catch (err) {
    console.error('\n❌ Deployment failed:', err);
    process.exit(1);
  }
}

main();
