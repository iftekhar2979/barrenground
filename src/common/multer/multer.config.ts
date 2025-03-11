// src/common/multer.config.ts
import { Worker } from 'worker_threads';
import multer, { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
const path = require('path');
import { FileType } from 'src/gallery/interface/gallery.interface';
import { randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';
// import fs from 'fs';
const fs = require('fs');

// Function to handle resizing image in a worker thread
export const resizeImage = (
  fileBuffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> => {
  console.time("RESIZE IMAGE")
  return new Promise((resolve, reject) => {
    // console.log(path);
    console.log("VALS IS JEREJE================================")
    const worker = new Worker(path.join(__dirname, 'resizeImageWorker.js'));
    worker.postMessage({ fileBuffer, width, height });

    worker.on('message', (result) => {
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result);
      }
      worker.terminate();
    });

    worker.on('error', (error) => {
      console.log('error', error);
      reject(error);
      worker.terminate();
    });

    worker.on('exit', (code) => {
      console.log('EXit', code);
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
    console.timeEnd("RESIZE IMAGE")
  });
};

// Multer configuration for handling file uploads
export const multerConfig = {
  storage: diskStorage({
    destination: 'public/uploads',
    filename: (req, file, callback) => {
      console.time("fileName")
      const uniqueSuffix = randomBytes(8).toString('hex'); // Faster than Date.now()
      callback(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      console.timeEnd("fileName")
    },
  }),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, callback) => {
    console.log("MULTER")
    console.time('fileFilter');
    console.log(file.mimetype)
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif','image/svg+xml',
      'audio/mpeg', 'audio/wav',
      'video/mp4', 'video/webm', 'video/ogg'
    ];
console.log(file)
    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      // throw new BadRequestException("File Type Not Allowed!")
      callback(new Error('Invalid file type.'), false);
    }
    console.timeEnd("fileFilter");
  },
};

export const multerMemoryConfig = {
  storage: memoryStorage(), // Store file in memory first
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, callback) => {
    console.log("MULTER FILTER")
    console.time('fileFilter');
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif',
      'audio/mpeg', 'audio/wav',
      'video/mp4', 'video/webm', 'video/ogg'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
    console.timeEnd("fileFilter");
  }} // Accepts a single file with the field name 'avatar'

// **Write File to Disk Automatically**
export const writeFileToDisk = async (file: Express.Multer.File) => {
  return new Promise<string>((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    console.time("FILE_WRITE");

    // Define the file path
    const uploadPath = path.join('public/uploads', `${Date.now()}-${file.originalname}`);

    // Create a writable stream
    const writeStream = fs.createWriteStream(uploadPath);

    // Write buffer data to file
    writeStream.write(file.buffer);
    writeStream.end();

    // Wait for file writing to complete
    writeStream.on('finish', () => {
      console.timeEnd("FILE_WRITE");
      resolve(uploadPath.replace('public/', '')); // Return file path
    });

    writeStream.on('error', (err) => {
      console.timeEnd("FILE_WRITE");
      reject(new Error('Error saving file: ' + err.message));
    });
  });
};