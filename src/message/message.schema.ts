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
        fileUrl: { type: String, required: true },
        type: { type: String, required: true }
      },
    ],
    default: [],
  })
  attachments: { fileUrl: string; type: string }[];
  @Prop({
    type: {
      question: { type: String, required: false },
      options: [
        {
          optionText: { type: String, required: true },
          votes: { type: Number, default: 0 }
        }
      ]
    },
    default: null
  })
  poll?: {
    question: string;
    options: { optionText: string; votes: number }[];
  };

  @Prop({ default: false })
  isDeleted: boolean;
}




export const MessageSchema = SchemaFactory.createForClass(Message);
