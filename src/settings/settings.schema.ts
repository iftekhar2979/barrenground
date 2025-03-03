import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Settings extends Document {
  @Prop({
    required: true,
    enum: ['privacy_policy', 'terms_and_condition', 'about_us'],
  })
  key: string;
  @Prop({ required: true })
  content: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
