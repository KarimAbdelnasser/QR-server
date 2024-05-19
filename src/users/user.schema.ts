import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop()
  userName: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  pin: string;

  @Prop()
  otp: string;

  @Prop({ required: true, maxlength: 11 })
  phoneNumber: string;

  @Prop({ required: true }) //A or B
  userType: string;

  @Prop({ required: true, default: false }) //A or B
  isLoggedIn: boolean;

  @Prop({ required: true, default: 'disable' })
  otpStatus: string;

  @Prop({ required: true })
  cardNumber: number;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isAdmin: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
