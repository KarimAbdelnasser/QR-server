import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ActiveOffer extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  otp: string;

  @Prop({ type: Boolean, default: false })
  otpVerified: boolean;

  @Prop({ type: Date, default: Date.now, expires: 1800 })
  createdAt: Date;
}

export const ActiveOfferSchema = SchemaFactory.createForClass(ActiveOffer);
