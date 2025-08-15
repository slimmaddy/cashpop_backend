import { registerAs } from "@nestjs/config";

export default registerAs("aws", () => ({
  s3: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: process.env.AWS_S3_BUCKET_NAME,
    baseUrl:
      process.env.AWS_S3_BASE_URL ||
      `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com`,
  },
}));
