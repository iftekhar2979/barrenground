import { Conversation } from './../chat/chat.schema';
import { Controller, Get, UseGuards,Request, Query, Param, ForbiddenException } from '@nestjs/common';
import { MessageService } from './message.service';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import { messagesWithPagination } from 'src/common/dto/pagination.dto';
import mongoose, { mongo, ObjectId } from 'mongoose';
import { group } from 'console';

@Controller('messages')
export class MessageController {
    constructor(
        private readonly messageService:MessageService
    ){}

  @Get('/:conversationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async getMessages(
    @Request() req ,
    @Param("conversationId") conversationId :string,
    @Query() query:messagesWithPagination
  ){
const userId = new mongoose.Types.ObjectId(req.user.id) as unknown as ObjectId
if(!conversationId){
    throw new ForbiddenException("Conversation Id not Provided")
}
let id=new mongoose.Types.ObjectId(conversationId) as unknown as ObjectId
let queryObj :{userId:ObjectId,groupId?:ObjectId,page:number,limit:number, conversationId?:ObjectId}={userId:userId,groupId:id,page:parseInt(query.page),limit:parseInt(query.limit)}
if(query.type==="individual"){
    queryObj={userId:userId,conversationId:id,page:parseInt(query.page),limit:parseInt(query.limit)}
}
return await this.messageService.getMessages(queryObj)


  }
}
