import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Event extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userID: mongoose.Schema.Types.ObjectId;
  @Prop({})
  eventName: string;

  @Prop({})
  eventDate: Date;

  @Prop({})
  eventTime: string;

  @Prop({})
  eventLocation: string;

  @Prop({})
  eventDescription: string;
  @Prop({ default: 0 })
  joined: number;
  @Prop({ default: false })
  isAcceptedByAdmin: boolean;
}

@Schema({ timestamps: true })
export class EventInformation extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userID: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  })
  eventId: mongoose.Schema.Types.ObjectId;
}

export const EventInfoSchema = SchemaFactory.createForClass(EventInformation);
export const EventSchema = SchemaFactory.createForClass(Event);
