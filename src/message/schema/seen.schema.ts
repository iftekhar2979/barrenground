import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types, } from "mongoose";

@Schema({ timestamps: true })
export class MessageSeen extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true, index: true })
  messageId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref:"User" ,required: true, index: true  })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  image: string;

  @Prop({ type: Date, default: Date.now })
  seenAt: Date;
}
  export const MessageSeenSchema = SchemaFactory.createForClass(MessageSeen);