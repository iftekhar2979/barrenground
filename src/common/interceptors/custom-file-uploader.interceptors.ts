// import { Injectable, ExecutionContext, CallHandler, NestInterceptor } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import * as AWS from 'aws-sdk';
// import { Observable, tap } from 'rxjs';
// import { UploadService } from 'src/common/multer/upload.service';

// @Injectable()
// export class CustomFileInterceptor implements NestInterceptor {
//   private s3: AWS.S3;

//   constructor(private readonly uploadService: UploadService) {
//     // Initialize the AWS S3 client
//     this.s3 = new AWS.S3({
//       region: 'your-region',
//       accessKeyId: 'your-access-key-id',
//       secretAccessKey: 'your-secret-access-key',
//       endpoint: 'http://localhost:4510', // LocalStack endpoint (adjust the port if needed)
//       s3ForcePathStyle: true, // Required for LocalStack to work
//       sslEnabled: false, // Disable SSL for LocalStack
//     });
//   }

//   intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//     const multerOptions = this.uploadService.getMulterOptions(); // Get the multer options dynamically
//     const FileInterceptorClass = FileInterceptor('avatar', multerOptions); // Use FileInterceptor internally
//     const fileInterceptor = new FileInterceptorClass(); // Create an instance of the interceptor

//     return (fileInterceptor.intercept(context, next) as Observable<any>).pipe(tap((file :any) => {
//         const uploadParams = {
//           Bucket: 'your-bucket-name',
//           Key: `uploads/${file.filename}`,
//           Body: file.buffer, // Assuming file.buffer is the content
//           ACL: 'public-read',
//         };

//         this.s3.upload(uploadParams, (err, data) => {
//           if (err) {
//             console.error('Error uploading file:', err);
//           } else {
//             console.log('File uploaded successfully:', data);
//           }
//         });
//       }),
//     );
//   }
// }
