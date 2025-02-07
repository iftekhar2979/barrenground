import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Group', required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sender: Types.ObjectId;

  @Prop({ required: false })
  content: string;

  @Prop({
    type: [
      {
        fileName: String,
        fileType: String,
        fileUrl: String,
      },
    ],
    default: [],
  })
  attachments: {
    fileName: string;
    fileType: string;
    fileUrl: string;
  }[];

  @Prop({ default: false })
  isDeleted: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
