import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true }) // Indexed but not unique
  userID: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String, required: true })
  message: string;
  @Prop({type:mongoose.Schema.Types.ObjectId,required:false})
  notificationFrom: mongoose.Schema.Types.ObjectId;
  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

@Schema()
export class DetailedNotification extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, unique: true }) // Indexed and unique
  notificationID: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: String, required: true,  }) // Example routing types
  routingType: string;
}

export const DetailedNotificationSchema =
  SchemaFactory.createForClass(DetailedNotification);
