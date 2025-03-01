import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import {
    ConversationOptions,
  PaginationDto,
  PaginationOptions,
  SearchByNameWithPagination,
} from 'src/common/dto/pagination.dto';
import { ChatService } from './chat.service';
import { ObjectId } from 'mongoose';

@Controller('chat')
export class ChatController {
  constructor(private readonly conversationService: ChatService) {}

  @Get('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  fullConversationForUser(
    @Request() req,
    @Query() pagination: ConversationOptions,
  ) {
    try {
      let userID = req.user.id;
      return this.conversationService.getUserConversations(
        userID,
        Number(pagination.page),
        Number(pagination.limit),
        pagination.type,
        pagination.term
      );
    } catch (error) {
      console.log(error);
    }
  }
  @Get('find')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  searchConversation(
    @Request() req,
    @Query() query: SearchByNameWithPagination,
  ) {
    try {
      let user = req.user;
      return this.conversationService.getUserConversations(
        user,
        parseFloat(query.page),
        parseFloat(query.limit),
      );
    } catch (error) {
      console.log(error);
      throw new NotFoundException(error.message);
    }
  }
  @Get('media/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  getMedia(@Param() conversationID: { id: string }, @Query() pagination:PaginationOptions) {
    try {
      // console.log(conversationID)
      return this.conversationService.mediasFromConversation(
        conversationID.id,
        Number(pagination.page),
        Number(pagination.limit),
      );
    } catch (error) {
      console.log(error);
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Post(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  deleteConversation(
    @Request() req,
    @Param() conversationID: { id: ObjectId },
  ) {
    let userID = req.user.id;
    return this.conversationService.deleteConversation(
      conversationID.id,
      userID,
    );
  }
  @Post('/block/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  blockConversation(@Request() req, @Param() conversationID: { id: ObjectId }) {
    console.log(req.user);
    let userID = req.user.id;
    return this.conversationService.blockConversation(
      userID,
      conversationID.id,
    );
  }

  @Post('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  createConversation(
    @Request() req,
    @Body("message") message:string, 
    @Query('participant') participant: string,
  ) {
    let userID = req.user.id;
    if (!participant) {
      throw new BadRequestException('Participant is required!');
    }
    if (participant === userID) {
      throw new BadRequestException(
        "It's Imposible to create conversation with your own account!",
      );
    }
    let participants = [participant, userID];

    return this.conversationService.createConversation(
      participants,
      userID,
      null,
      message,
    );
  }
  @Post('/:chatId/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  acceptRequest(@Request() req, @Param('chatId') chatId: string) {
    let userID = req.user.id;
    if (!chatId) {
      throw new BadRequestException('Participant is required!');
    }
    return this.conversationService.acceptMessageRequest(chatId, userID);
  }
}
