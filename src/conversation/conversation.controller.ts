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
  HttpException,
  UnauthorizedException,
  Patch,
  Delete,
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

  @Get('/chart')
  async getAnalyticsWithChart(
    @Query('limit') limit: string,
    @Query('year') year: string,
    @Query('page') page: string,
  ): Promise<any> {
    if (!limit && !page) {
      limit = '10';
      page = '1';
    }
    return await this.groupService.getAllGroupsAndUsers({
      year: parseFloat(year) || new Date().getFullYear(),
    });
  }
  @Get('/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  getUsers(
    @Request() req,
    @Query('groupId') groupId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.groupService.getUsers({
      groupId,
      userId: req.user.id,
      page: parseFloat(page),
      limit: parseFloat(limit),
    });
  }
  @Get('/friends')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  getMyFriends(
    @Request() req,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.groupService.getMyFriends({
      userId: req.user.id,
      page: parseFloat(page),
      limit: parseFloat(limit),
    });
  }
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
      throw new UnauthorizedException('No User Found');
    }
    if (body.name.length < 40 || body.name.length >= 3) {
      throw new BadRequestException(
        'Group Name Must be between 3 to 40 characters',
      );
    }
    if (body.description.length < 100 || body.description.length > 3) {
      throw new BadRequestException(
        'Group Name Must be between 3 to 100 characters',
      );
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
        req.user.name,
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
  @Roles('user', 'admin')
  async getAllConversation(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchTerm') search: string,
    @Query('involved') involved: 'yes' | 'no',
    @Query('accepted') accepted: 'true' | 'false',
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
    let query: { isUserInvolved: boolean } = {
      isUserInvolved: false,
    };
    if (involved === 'yes') {
      query = { isUserInvolved: true };
    }
    let acceptQuery: { isAccepted?: boolean } = { isAccepted: false };
    // if(!accepted){
    //   acceptQuery={}
    // }
    if (accepted === 'true') {
      acceptQuery.isAccepted = true;
    } else {
      acceptQuery.isAccepted = false;
    }
    return await this.groupService.getAllConversations(
      req.user.id,
      page,
      limit,
      search,
      query,
      acceptQuery,
    );
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
      req.user.name,
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
    return this.groupService.joinPublicGroup(groupId, req.user.id);
  }
  @Post('/group/:groupId/leave')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  leaveGroup(@Request() req, @Param('groupId') groupId: string) {
    return this.groupService.leaveGroup(groupId, req.user.id);
  }

  @Patch('/group/verify/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  acceptGroup(@Request() req, @Param('groupId') groupId: string) {
    return this.groupService.verifyGroup(groupId);
  }
  @Delete('/group/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteGroup(@Request() req, @Param('groupId') groupId: string) {
    if (!groupId) {
      throw new BadRequestException('Group ID is required');
    }
    return this.groupService.deleteGroup(groupId);
  }
}
