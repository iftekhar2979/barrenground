import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types, } from "mongoose";

@Schema({ timestamps: true })
export class Reaction extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
    messageId: Types.ObjectId;
  
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;
  
    @Prop({type:String, required: true ,})
    value: string;
  }

export const ReactionSchema = SchemaFactory.createForClass(Reaction);