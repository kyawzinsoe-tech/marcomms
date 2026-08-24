const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

function getS3Client() {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });
  }

  // Uses default AWS IAM Role credentials if running inside AWS Lambda / EC2
  return new S3Client({ region });
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

module.exports = {
  uploadBackupToS3
};
