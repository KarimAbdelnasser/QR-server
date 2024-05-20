import { MiddlewareConsumer, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './user.schema';
import { UsersController } from './users.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { config } from '../config/config';
import { QRService } from 'src/qr/qr.service';
import { QrSchema } from 'src/qr/qr.schema';
import { ActiveOfferSchema } from './activeOffer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    MongooseModule.forFeature([{ name: 'Qr', schema: QrSchema }]),
    MongooseModule.forFeature([
      { name: 'ActiveOffer', schema: ActiveOfferSchema },
    ]),
    JwtModule.register({
      secret: config.scanJwt,
    }),
    JwtModule.register({
      secret: config.appJwt,
    }),
  ],
  exports: [UsersService],
  providers: [UsersService, AuthService, QRService],
  controllers: [UsersController],
})
export class UserModule {}
