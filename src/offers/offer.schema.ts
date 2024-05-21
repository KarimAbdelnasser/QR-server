import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

@Schema({ timestamps: true })
export class Offer extends Document {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  imgName: string;

  @Prop({ required: true })
  categoryNumber: number;

  @Prop({ required: true })
  offerName: string;

  @Prop({ required: true })
  offerPercentage: number;

  @Prop({ required: true })
  offerDescription: string;

  @Prop({ type: Date, expires: 0 })
  expiresAt: Date;

  @Prop({ required: true })
  usersType: string;

  @Prop()
  branch: {
    txt: string;
    subscribe: string;
    renewal: string;
    year: string;
    threeMonth: string;
  }[];
}

export const OfferSchema = SchemaFactory.createForClass(Offer);

OfferSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Set initial expireAfterSeconds to 0

OfferSchema.pre('save', function (next) {
  // Calculate the TTL based on expiresAt field
  const now = new Date();
  const ttl = Math.floor((this.expiresAt.getTime() - now.getTime()) / 1000); // Convert milliseconds to seconds
  this.expiresAt = this.expiresAt; // Update expiresAt field to itself
  this.schema.index({ expiresAt: 1 }, { expireAfterSeconds: ttl }); // Update the TTL index
  next();
});
