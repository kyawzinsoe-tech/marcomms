const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function getS3Client() {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  // Presigned browser PUT uploads provide the body after URL generation. Avoid
  // SDK default checksums calculated against the empty signing-time body.
  const clientConfig = { region, requestChecksumCalculation: 'WHEN_REQUIRED' };

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      ...clientConfig,
      credentials: { accessKeyId, secretAccessKey }
    });
  }

  // Uses default AWS IAM Role credentials if running inside AWS Lambda / EC2
  return new S3Client(clientConfig);
}

async function uploadBackupToS3(key, data) {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    console.log('[S3 Service] AWS_S3_BUCKET not set. Skipping remote S3 upload.');
    return { uploaded: false, reason: 'AWS_S3_BUCKET not configured' };
  }

  try {
    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: `backups/${key}`,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json'
    });

    await s3.send(command);
    console.log(`[S3 Service] Successfully uploaded backup to s3://${bucket}/backups/${key}`);
    return { uploaded: true, bucket, key: `backups/${key}` };
  } catch (error) {
    console.error('[S3 Service] S3 upload error:', error.message);
    return { uploaded: false, error: error.message };
  }
}

function getAssetBucket() {
  const bucket = process.env.AWS_ASSET_BUCKET || process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_ASSET_BUCKET is not configured');
  return bucket;
}

async function createAssetUploadUrl({ key, mimeType }) {
  return getSignedUrl(getS3Client(), new PutObjectCommand({
    Bucket: getAssetBucket(),
    Key: key,
    ContentType: mimeType,
    ServerSideEncryption: 'AES256',
    Metadata: { upload: 'marcomms-brand-asset' }
  }), { expiresIn: 300 });
}

async function readAssetSignature(key) {
  const response = await getS3Client().send(new GetObjectCommand({
    Bucket: getAssetBucket(), Key: key, Range: 'bytes=0-15'
  }));
  const bytes = await response.Body.transformToByteArray();
  return { bytes: Buffer.from(bytes), contentType: response.ContentType, contentLength: response.ContentLength };
}

async function deleteAssetObject(key) {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: getAssetBucket(), Key: key }));
}

async function createAssetDownloadUrl(key) {
  return getSignedUrl(getS3Client(), new GetObjectCommand({
    Bucket: getAssetBucket(), Key: key, ResponseContentDisposition: 'inline'
  }), { expiresIn: 300 });
}

async function createPrivateUploadUrl({ key, mimeType, metadata = {} }) {
  return getSignedUrl(getS3Client(), new PutObjectCommand({
    Bucket: getAssetBucket(), Key: key, ContentType: mimeType,
    ServerSideEncryption: 'AES256', Metadata: metadata
  }), { expiresIn: 300 });
}

async function readPrivateFileSignature(key) {
  return readAssetSignature(key);
}

async function createPrivateDownloadUrl(key, filename = 'document') {
  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return getSignedUrl(getS3Client(), new GetObjectCommand({
    Bucket: getAssetBucket(), Key: key,
    ResponseContentDisposition: `attachment; filename="${safeName}"`
  }), { expiresIn: 300 });
}

module.exports = {
  uploadBackupToS3,
  createAssetUploadUrl,
  readAssetSignature,
  deleteAssetObject,
  createAssetDownloadUrl,
  createPrivateUploadUrl,
  readPrivateFileSignature,
  createPrivateDownloadUrl
};
