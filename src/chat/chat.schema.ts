import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({
    type: [mongoose.Schema.Types.ObjectId], // Correct type for an array of ObjectIds
    ref: 'User',
    required: true,
  })
  participants: mongoose.Schema.Types.ObjectId[]; // Explicitly typing it as an array of ObjectId

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: false,
  })
  lastMessage: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: Boolean,
    default: false,
  })
  isBlocked: Boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  isBlockedBy: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: [mongoose.Schema.Types.ObjectId], 
    ref: 'User',
    required: false,
  })
  deletedBy: mongoose.Schema.Types.ObjectId[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);