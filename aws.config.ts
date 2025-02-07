export const awsConfig = {
    region: process.env.AWS_REGION || 'test',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
    bucketName: process.env.AWS_S3_BUCKET_NAME || "barrengroup-bucket",
  };
  