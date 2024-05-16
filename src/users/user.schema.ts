import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop()
  userName: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  otp: Array<string>;

  @Prop({ required: true })
  cardNumber: number;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isAdmin: boolean;

  @Prop()
  secretKey: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
