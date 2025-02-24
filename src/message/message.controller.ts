import { Conversation } from './../chat/chat.schema';
import { Controller, Get, Post, UseGuards, Request, Query, Param, ForbiddenException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { MessageService } from './message.service';
import { Roles } from 'src/common/custom-decorator/role.decorator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/role-gurad';
import { messagesWithPagination } from 'src/common/dto/pagination.dto';
import mongoose, { mongo, ObjectId } from 'mongoose';
import { group } from 'console';
import { FileInterceptor } from '@nestjs/platform-express';

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

//   @Post('/upload')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles('user')
//   @UseInterceptors(FileInterceptor('image'))
//   async uploadImage(@UploadedFile() file: Express.Multer.File) {
//     if (!file) {
//       throw new BadRequestException('Image file is required');
//     }
//     // Process the image file as needed, e.g., store it or attach it to a message.
//     // return await this.messageService.handleImageUpload(file);
//   }
}
