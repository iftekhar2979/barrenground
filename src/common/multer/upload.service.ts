import { Injectable } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { S3 } from 'aws-sdk';
import { awsConfig } from 'aws.config'; // Correct import of awsConfig
import * as multerS3 from 'multer-s3';
import * as path from 'path';

@Injectable()
export class UploadService {
  private s3 = new S3({
    region: awsConfig.region,
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
    endpoint: 'http://localhost:4510', // LocalStack endpoint (adjust the port if needed)
    s3ForcePathStyle: true, // Required for LocalStack to work
    sslEnabled: false, // Disable SSL for LocalStack
  });

  // Configure Multer-S3 for file uploads
  getMulterOptions(): MulterOptions {
    return {
      storage: multerS3({
        s3: this.s3,
        bucket: awsConfig.bucketName,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, callback) => {
          const fileExt = path.extname(file.originalname);
          const fileName = `uploads/${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
          console.log('Generated file name:', fileName);
          callback(null, fileName);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf/;
        const isValidType = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        console.log('Is file valid?', isValidType);
        if (isValidType) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type'), false); // Error message
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // Max file size 5MB
    };
  }

  // Method to check the uploaded file in the bucket
  checkFileInBucket(fileName: string): void {
    this.s3.headObject(
      {
        Bucket: awsConfig.bucketName,
        Key: fileName, // The file path or key generated
      },
      (err, data) => {
        if (err) {
          console.error('Error retrieving file from S3:', err.message);
        } else {
          console.log('File successfully stored in S3:', data);
        }
      }
    );
  }
}
