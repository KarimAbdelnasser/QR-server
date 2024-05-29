import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ActiveOtp extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  otp: string;

  @Prop({ type: Boolean, default: false })
  otpVerified: boolean;

  @Prop({ type: Date, default: Date.now})
  createdAt: Date;
}

export const ActiveOtpSchema = SchemaFactory.createForClass(ActiveOtp);

ActiveOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });