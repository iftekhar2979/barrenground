import { Controller, Get, HttpException, NotFoundException, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import { PaginationOptions, SearchByNameWithPagination } from 'src/common/dto/pagination.dto';
import { ConversationService } from 'src/conversation/conversation.service';
import { ChatService } from './chat.service';

@Controller('chat')
// export class ChatController {}
export class ChatController {
    constructor(private readonly conversationService: ChatService) {}
    // @Get("")

  
    // @Get('')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('user')
    // fullConversationForUser(
    //   @Request() req,
    //   @Query() pagination: PaginationOptions,
    // ) {
    //   try {
    //     let userID = req.user.id;
    //     return this.conversationService.getUserConversations(
    //       userID,
    //       Number(pagination.page),
    //       Number(pagination.limit),
    //     );
    //   } catch (error) {
    //     console.log(error);
    //   }
    // }
    // @Get('find')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('user')
    // searchConversation(
    //   @Request() req,
    //   @Query() query:SearchByNameWithPagination ,
    // ) {
    //   try {
    //     let user = req.user;
    //     return this.conversationService.getAllConversations(
    //       user,
    //       query.term,
    //       parseFloat(query.page),
    //       parseFloat(query.limit),
    //     );
    //   } catch (error) {
    //     console.log(error);
    //     throw new NotFoundException(error.message);
    //   }
    // }
  
    // @Get('media/:id')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('user')
    // getMedia(@Param() conversationID: { id: string }, @Query() pagination: any) {
    //   try {
    //     // console.log(conversationID)
    //     return this.conversationService.mediasFromConversation(
    //       conversationID.id,
    //       Number(pagination.page),
    //       Number(pagination.limit),
    //     );
    //   } catch (error) {
    //     console.log(error);
    //     throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    //   }
    // }
  
    // @Post(':id')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('user')
    // deleteConversation(
    //   @Request() req,
    //   @Param() conversationID: { id: ObjectId },
    // ) {
    //   let userID = req.user.id;
    //   return this.conversationService.deleteConversation(
    //     conversationID.id,
    //     userID,
    //   );
    // }
    // @Post('/block/:id')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('user')
    // blockConversation(
    //   @Request() req,
    //   @Param() conversationID: { id: ObjectId },
    // ) {
    //   console.log(req.user)
    //   let userID = req.user.id;
    //   return this.conversationService.blockConversation(userID,conversationID.id)
    // }
  
    // @Post('')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('user')
    // @subscriptionType("Plus")
    // createConversation(
    //   @Request() req,
    //   @Query('participant') participant: string,
    // ) {
    //   let userID = req.user.id;
    //   if(participant===userID){
    //     throw new BadRequestException("It's Imposible to create conversation with your own account!")
    //   }
    //   let participants = [participant, userID];
    //   return this.conversationService.createConversation(participants, null);
    // }
  }
