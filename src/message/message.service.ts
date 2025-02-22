import { Injectable, NotFoundException } from '@nestjs/common';
import { Message } from './message.schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'aws-sdk/clients/acm';
import { group } from 'node:console';
import { CreateMessageDto } from './dto/createMessage.dto';

@Injectable()
export class MessageService {
constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>
){

} 
  create(createMessageDto: CreateMessageDto) {
    return  this.messageModel.create(createMessageDto);
  
  }

  async deleteMessage(id: string): Promise<Message> {
    if (!id) {
      throw new NotFoundException(`Message with id ${id} is invalid`);
    }

    const deletedMessage = await this.messageModel.findByIdAndDelete(id).exec();

    if (!deletedMessage) {
      throw new NotFoundException(`Message with id ${id} not found`);
    }

    return deletedMessage;
  }
  
 findAllForGroupPaginated(
    groupId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<Message[]> {
    if (!groupId) {
      throw new NotFoundException(`Group with id ${groupId} is invalid`);
    }
    
    const skip = (page - 1) * limit;
    
    return this.messageModel
      .find({ groupId: new mongoose.Types.ObjectId(groupId),isDeleted:false })
      .populate('sender', 'name email profilePicture') 
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

}
