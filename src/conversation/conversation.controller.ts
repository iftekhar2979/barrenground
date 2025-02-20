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
    @Body() body: { name: string; type: string; users: string | string[] },
  ) {
    if (!req.user) {
      throw new Error('No User Found');
    }
    let avatarUrl: string = '';
    if (!req.file) {
      avatarUrl = `uploads/group.jpg`;
    } else {
      avatarUrl = `uploads/${req.file.filename}`;
    }
    if (typeof body.users === 'string') {
      body.users = body.users.split(',');
    }
    try {
      return this.groupService.createGroup(
        body.name,
        avatarUrl,
        body.type,
        req.user.id,
        body.users,
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
    @Body() body: {userId: string[] },
  ) {
    if (!req.user) {
      throw new ForbiddenException('No user found');
    }

    try {
      return await this.groupService.addAllUsersToGroup(
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
  async getAllParticipant(@Request() req, @Param('groupId') groupId: string,@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    page = Math.max(Number(page), 1);
    limit = Math.max(Number(limit), 1);
    if (!page || !limit) {  
      throw new ForbiddenException(
        'Please set Pagination First with limit and page',
      );
    }
    if (!req.user) {
      throw new ForbiddenException('No user found');
    }

    try {
      return await this.groupService.getGroupParticipants(groupId,page,limit);
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
    @Query('searchTerm') search: string,
  ) {
    page = Math.max(Number(page), 1);
    limit = Math.max(Number(limit), 1);
    if (!page || !limit) {
      throw new ForbiddenException(
        'Please set Pagination First with limit and page',
      );
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
        search
      );
    } catch (error) {
      throw new Error('Error adding user to group: ' + error.message);
    }
  }
  @Post('/group/:groupId/remove/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async removeUserFromGroup(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    try {
      if (!req.user) {
        throw new ForbiddenException('No user found');
      }
      const removedBy = req.user.id;
      return await this.groupService.removeUserFromGroup(
        groupId,
        userId,
        removedBy,
      );
    } catch (error) {
      throw new Error('Error adding user to group: ' + error.message);
    }
  }

  @Post('/group/:groupId/promote/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async promote(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.groupService.promoteUserToAdmin(groupId, userId, req.user.id);
  }

  @Post('/group/:groupId/join')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  joinGroup(
    @Request() req,
    @Param('groupId') groupId: string,
    // @Param('userId') userId: string,
  ) {
    // const 
    return this.groupService.joinPublicGroup(groupId, req.user.id);
  }
  // async promote(
  //   @Request() req,
  //   @Param('groupId') groupId: string,
  //   @Param('userId') userId: string,
  // ) {
  //   return this.groupService.promoteUserToAdmin(groupId, userId, req.user.id)
  // }
}
