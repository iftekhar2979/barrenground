// src/gallery/gallery.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  Get,
  Request,
  UploadedFiles,
  UseGuards,
  Query,
  Delete,
  Param,
  UploadedFile,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { GalleryService } from './gallery.service';
//   import { FileUploadController } from '../common/multer/file-upload.service';
import { multerConfig } from 'src/common/multer/multer.config';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import mongoose, { ObjectId } from 'mongoose';

console.log("Testing Temporary File Has been added")
@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  findAll(@Request() req) {
    let user = req.user; // Assuming user info is in the request
    return this.galleryService.getFullGallery(user);
  }
  // Route for uploading a single image
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'files', maxCount: 6 }, // You can limit the number of files here
      ],
      multerConfig,
    ),
  )
  uploadFiles(
    @Request() req,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
  ) {
    let user = req.user; 
    return this.galleryService.addImage(user, files.files);
  }
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  imagesUpload(@Request() req, @UploadedFile() file: Express.Multer.File) {
    console.log(file);
    let user = req.user; // Assuming user info is in the request
    return this.galleryService.addSingleImage(user, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  deleteOne(@Request() req, @Param() imageID: { id: string }) {
    // console.log('imageId', imageID.id);
    let user = req.user; // Assuming user info is in the request
    return this.galleryService.removeImage(user, imageID.id);
  }
  // Route to get all uploaded images
  // @Get('images')
  // getAllImages() {

  // return   this.galleryService.getImages();
  // }
}
