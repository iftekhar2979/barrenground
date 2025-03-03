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
  BadRequestException,
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
    @Body()
    body: {
      name: string;
      type: string;
      users: string | string[];
      description: string;
    },
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
        req.user,
        body.name,
        avatarUrl,
        body.type,
        body.description,
        req.user.id,
        body.users,
      );
    } catch (error) {
      // console.log(error)
      throw new BadRequestException('Image Type Not Allowed');
      // throw new Error('Error uploading file: ' + error.message);
    }
  }

  @Post('/group/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async addUserToGroup(
    @Request() req,
    @Param('groupId') groupId: string,
    @Body() body: { userId: string[] },
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
      throw new BadRequestException(error.message);
    }
  }
  @Get('/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async getConversationByID(@Request() req, @Param('groupId') groupId: string) {
    if (!groupId) {
      throw new ForbiddenException('No Group found');
    }

    try {
      return await this.groupService.getGroupById(groupId, req.user.id);
    } catch (error) {
      throw new Error('Error adding user to group: ' + error.message);
    }
  }

  @Get('/group/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async getAllParticipant(
    @Request() req,
    @Param('groupId') groupId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
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

    try {
      return await this.groupService.getGroupParticipants(groupId, page, limit);
    } catch (error) {
      throw new Error('Error adding user to group: ' + error.message);
    }
  }

  @Get('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async getAllConversation(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchTerm') search: string,
    @Query('involved') involved: 'yes' | 'no',
  ) {
    page = Math.max(Number(page), 1);
    limit = Math.max(Number(limit), 1);
    if (!page || !limit) {
      throw new ForbiddenException(
        'Please set Pagination First with limit and page',
      );
    }
    if (involved !== 'yes' && involved !== 'no') {
      throw new ForbiddenException('Involved Parameter Must be yes or no');
    }
    if (!req.user) {
      throw new ForbiddenException('No user found');
    }
    let query: { isUserInvolved: boolean } = { isUserInvolved: false };
    if (involved === 'yes') {
      query = { isUserInvolved: true };
    }
    try {
      return await this.groupService.getAllConversations(
        req.user.id,
        page,
        limit,
        search,
        query,
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
    if (!req.user) {
      throw new ForbiddenException('No user found');
    }
    const removedBy = req.user.id;
    return await this.groupService.removeUserFromGroup(
      groupId,
      userId,
      removedBy,
    );
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
  joinGroup(@Request() req, @Param('groupId') groupId: string) {
    // const
    return this.groupService.joinPublicGroup(groupId, req.user.id);
  }
  @Post('/group/:groupId/leave')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  leaveGroup(
    @Request() req,
    @Param('groupId') groupId: string,
    // @Param('userId') userId: string,
  ) {
    // const
    return this.groupService.leaveGroup(groupId, req.user.id);
  }
  // async promote(
  //   @Request() req,
  //   @Param('groupId') groupId: string,
  //   @Param('userId') userId: string,
  // ) {
  //   return this.groupService.promoteUserToAdmin(groupId, userId, req.user.id)
  // }
}
