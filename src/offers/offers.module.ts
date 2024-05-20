import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { MongooseModule } from '@nestjs/mongoose';
import { OfferSchema } from './offer.schema';
import { UsersService } from 'src/users/users.service';
import { UserModule } from 'src/users/users.module';
import { UserSchema } from 'src/users/user.schema';
import { QrSchema } from 'src/qr/qr.schema';
import { AuthService } from 'src/users/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ActiveOfferSchema } from 'src/users/activeOffer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Offer', schema: OfferSchema }]),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    MongooseModule.forFeature([{ name: 'Qr', schema: QrSchema }]),
    MongooseModule.forFeature([
      { name: 'ActiveOffer', schema: ActiveOfferSchema },
    ]),
  ],
  controllers: [OffersController],
  exports: [OffersService],
  providers: [OffersService, UsersService, AuthService, JwtService],
})
export class OfferModule {}
