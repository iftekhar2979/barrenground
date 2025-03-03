import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import mongoose, { model, Document } from 'mongoose';

export interface IReport extends Document {
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  reportedBy:{
    name: string;
    email: string;
    _id: mongoose.Schema.Types.ObjectId;
  }
  userID: {
    name: string;
    email: string;
    _id: mongoose.Schema.Types.ObjectId;
  };
  __v: 0;
}

@Schema({ timestamps: true })
export class Report extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  userID: mongoose.Schema.Types.ObjectId;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  reportedBy: mongoose.Schema.Types.ObjectId;
  @Prop({ type: String })
  title: string;
  @Prop({ type: String })
  description: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
