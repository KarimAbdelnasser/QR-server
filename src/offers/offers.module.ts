import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { MongooseModule } from '@nestjs/mongoose';
import { OfferSchema } from './offer.schema';
import { UsersService } from 'src/users/users.service';
import { UserSchema } from 'src/users/user.schema';
import { QrSchema } from 'src/qr/qr.schema';
import { AuthService } from 'src/users/auth.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Offer', schema: OfferSchema }]),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    MongooseModule.forFeature([{ name: 'Qr', schema: QrSchema }]),
  ],
  controllers: [OffersController],
  exports: [OffersService],
  providers: [OffersService, UsersService, AuthService, JwtService],
})
export class OfferModule {}
