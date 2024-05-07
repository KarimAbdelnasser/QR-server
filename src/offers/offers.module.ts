import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { MongooseModule } from '@nestjs/mongoose';
import { OfferSchema } from './offer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Offer', schema: OfferSchema }]),
  ],
  controllers: [OffersController],
  exports: [OffersService],
  providers: [OffersService],
})
export class OfferModule {}
