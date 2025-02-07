import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from 'src/common/multer/upload.service';
import { ConversationService } from './conversation.service';
// import { CustomFileInterceptor } from 'src/common/interceptors/custom-file-uploader.interceptors';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import { multerConfig } from 'src/common/multer/multer.config';
// import { Request } from 'express';

@Controller('conversation')
export class ConversationController {
  constructor(private readonly groupService: ConversationService) {}

  @Post('/')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  // @UseInterceptors(CustomFileInterceptor)
  @Roles('user')
  async createGroup(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,

    @Body() body: { name: string; type: string },
  ) {
    if (!file) {
      throw new Error('Avatar image is required');
    }
    if (!req.user) {
      throw new Error('No User Found');
    }
    const avatarUrl = `${req.file.destination.split('/')[1]}/${req.file.filename}`;

    try {
      console.log(req.file);
      return this.groupService.createGroup(
        body.name,
        avatarUrl,
        body.type,
        req.user.id,
      );
    } catch (error) {
      throw new Error('Error uploading file: ' + error.message);
    }
  }

  @Post('/group/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user') // You can add more roles as needed
  async addUserToGroup(
    @Request() req,
    @Param('groupId') groupId: string,
    @Body() body: { userId: string },
  ) {
    if (!req.user) {
      throw new ForbiddenException('No user found');
    }

    try {
      return await this.groupService.addUserToGroup(
        groupId,
        body.userId,
        req.user.id,
      );
    } catch (error) {
      throw new Error('Error adding user to group: ' + error.message);
    }
  }
}
