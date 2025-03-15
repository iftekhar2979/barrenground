import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Otp extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    default: null,
    unique: true,
  })
  userID: mongoose.Schema.Types.ObjectId;
  @Prop({ required: true })
  oneTimePassword: string;
  @Prop({ required: true ,expires:"1m"})
  expiredAt: Date;
  @Prop({ default: 0 })
  attempts: number;
}
export const OtpSchema = SchemaFactory.createForClass(Otp);
