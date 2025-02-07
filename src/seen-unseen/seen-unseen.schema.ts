import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class ReadReceipt extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true, index: true })
  messageId: Types.ObjectId; // Message that was read

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId; // User who read the message

  @Prop({ type: Date, required: true })
  seenAt: Date; // Timestamp when the message was read
}

export const ReadReceiptSchema = SchemaFactory.createForClass(ReadReceipt);
