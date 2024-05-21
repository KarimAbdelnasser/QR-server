import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

@Schema({ timestamps: true })
export class Qr extends Document {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  qrValue: string;

  @Prop({ required: true, length: 8 })
  cardNumber: string;

  @Prop({ required: true })
  userName: string;
}

export const QrSchema = SchemaFactory.createForClass(Qr);
