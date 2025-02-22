import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Group', required: false, index: true,default:null })
  groupId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: false, index: true,default:null })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sender: Types.ObjectId;

  @Prop({ required: false })
  content: string;

  @Prop({
    type: [
      {
        fileUrl: String,
        type:String
      },
    ],
    default: [],
  })
  attachments: {
    type:string
    fileUrl: string;
  }[]

  @Prop({ default: false })
  isDeleted: boolean;
}




export const MessageSchema = SchemaFactory.createForClass(Message);
