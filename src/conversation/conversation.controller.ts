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
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
// import { UploadService } from 'src/common/multer/upload.service';
import { ConversationService } from './conversation.service';
// import { CustomFileInterceptor } from 'src/common/interceptors/custom-file-uploader.interceptors';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import {
  multerConfig,
  multerMemoryConfig,
} from 'src/common/multer/multer.config';
import { ObjectId } from 'mongoose';
import { memoryStorage } from 'multer';
// import { Request } from 'express';

@Controller('conversation')
export class ConversationController {
  constructor(private readonly groupService: ConversationService) {}

  @Post('/')
  @UseInterceptors(FileInterceptor('avatar', multerConfig)) // Ensure this is at the top
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async createGroup(
    @Request() req,
    @Body() body: { name: string; type: string },
  ) {

    if (!req.user) {
      throw new Error('No User Found');
    }
   let avatarUrl:string=""
    if(!req.file){
      
       avatarUrl = `uploads/group.jpg`;
    }else{

       avatarUrl = `uploads/${req.file.filename}`;
    }
    // console.timeEnd("STARTED")
    try {
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
  @Roles('user') 
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
  @Get('/group/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user') // You can add more roles as needed
  async getAllParticipant(@Request() req, @Param('groupId') groupId: string) {
    if (!req.user) {
      throw new ForbiddenException('No user found');
    }

    try {
      return await this.groupService.getGroupParticipants(groupId);
    } catch (error) {
      throw new Error('Error adding user to group: ' + error.message);
    }
  }
  @Get('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user') // You can add more roles as needed
  async getAllConversation(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    page = Math.max(Number(page), 1);
    limit = Math.max(Number(limit), 1);
    if (!page || !limit) {
      throw new ForbiddenException('Please set Pagination First with limit and page');
    }
    if (!req.user) {
      throw new ForbiddenException('No user found');
    }
    console.log(req.user.id);
    try {
      return await this.groupService.getAllConversations(
        req.user.id,
        page,
        limit,
      );
    } catch (error) {
      throw new Error('Error adding user to group: ' + error.message);
    }
  }
}
