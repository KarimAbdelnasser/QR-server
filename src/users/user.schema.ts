import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop()
  userName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  pin: string;

  @Prop({ required: true, maxlength: 11 })
  phoneNumber: string;

  @Prop({ required: true, enum: ['A', 'B'] }) //A or B
  userType: string;

  @Prop({ required: true, default: false })
  isLoggedIn: boolean;

  @Prop({ required: true, default: 'disable' })
  otpStatus: string;

  @Prop({ required: true })
  cardNumber: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isAdmin: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
