import { Conversation } from './../chat/chat.schema';
import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Query,
  Param,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  UploadedFiles,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import { messagesWithPagination } from 'src/common/dto/pagination.dto';
import mongoose, { mongo, ObjectId } from 'mongoose';
import { group } from 'console';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/multer/multer.config';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('/:conversationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async getMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query() query: messagesWithPagination,
  ) {
    const userId = new mongoose.Types.ObjectId(
      req.user.id,
    ) as unknown as ObjectId;
    if (!conversationId) {
      throw new ForbiddenException('Conversation Id not Provided');
    }
    let id = new mongoose.Types.ObjectId(conversationId) as unknown as ObjectId;
    let queryObj: {
      userId: ObjectId;
      groupId?: ObjectId;
      page: number;
      limit: number;
      conversationId?: ObjectId;
    } = {
      userId: userId,
      groupId: id,
      page: parseInt(query.page),
      limit: parseInt(query.limit),
    };

    if (query.type === 'individual') {
      queryObj = {
        userId: userId,
        conversationId: id,
        page: parseInt(query.page),
        limit: parseInt(query.limit),
      };
    }
    return await this.messageService.getMessages(queryObj);
  }
  @Post('')
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
  async sendMessage(
    @Request() req,
    @Body('messageOn') messageOn: string,
    @Body('conversationID') conversationID: string,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
  ) {
    const user = req.user;
    if (messageOn !== 'group' && messageOn !== 'individual') {
      throw new BadRequestException(
        'Invalid message type .. messageOn should be group || individual',
      );
    }
    return await this.messageService.sendFileAsMessageWithRest(
      user.id,
      conversationID,
      files.files,
      messageOn,
    );
  }
  @Post('/poll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async createPoll(
    @Request() req,
    @Body('messageOn') messageOn: string,
    @Body('conversationID') conversationID: string,
    @Body('question') question: string,
    @Body("options") options: { optionText: string; votes?: number }[]
  ) {
    if (messageOn !== 'group') {
      throw new BadRequestException(
        'Invalid message type .. messageOn should be group',
      );
    }
    return await this.messageService.createPoll(req.user.id,conversationID,question,options)
  }

}
