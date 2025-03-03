import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Group',
    required: false,
    index: true,
    default: null,
  })
  groupId: Types.ObjectId;
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: false,
    index: true,
    default: null,
  })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sender: Types.ObjectId;

  @Prop({ required: false })
  content: string;

  @Prop({
    type: [
      {
        fileUrl: { type: String, required: true },
        type: { type: String, required: true },
      },
    ],
    default: [],
  })
  attachments: { fileUrl: string; type: string }[];
  @Prop({
    type: String,
    default: 'text',
    enum: ['text', 'image', 'video', 'poll'],
  })
  type: string;
  @Prop({
    type: {
      question: { type: String, required: false },
      options: [
        {
          optionText: { type: String, required: true },
          votes: { type: Number, default: 0 },
        },
      ],
    },
    default: null,
  })
  poll?: {
    question: string;
    options: { optionText: string; votes: number }[];
  };
  @Prop({
    type: Map,
    of: Number,
    default: () => {
      return {
        haha: 0,
        cancel: 0,
        like: 0,
        love: 0,
        angry: 0,
        ok: 0,
      };
    },
  })
  reactions?: Map<string, number>;
  
  @Prop({ default: false })
  isDeleted: boolean;
}
export const MessageSchema = SchemaFactory.createForClass(Message);
@Schema({ timestamps: true })
export class PollVote extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  messageId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  optionIndex: number;
}
export class Reaction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  messageId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({type:String, required: true ,})
  value: string;
}

export const PollVoteSchema = SchemaFactory.createForClass(PollVote);
export const ReactionSchema = SchemaFactory.createForClass(Reaction);
