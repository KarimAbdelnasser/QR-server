import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppService } from './app.service';
import { UserModule } from 'src/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { config } from 'src/config/config';
import { logger } from 'src/utility/logger';
import { MorganMiddleware } from 'src/middleware/morgan.middleware';
import { AppJwtMiddleware } from 'src/middleware/app.jwt.middleware';
import { QrModule } from 'src/qr/qr.module';
import { OfferModule } from 'src/offers/offers.module';
import { IsVerifiedMiddleware } from 'src/middleware/isVerified.middleware';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: () => ({ uri: config.mongoUrlPro }),
    }),
    UserModule,
    QrModule,
    OfferModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: 'Logger', useValue: logger }],
  exports: ['Logger'],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AppJwtMiddleware)
      .exclude(
        { path: 'user/createCard', method: RequestMethod.POST }, // TODO remove it in production
        { path: 'user/scan', method: RequestMethod.GET },
        { path: 'user/logIn', method: RequestMethod.POST },
        { path: 'user/verifyPin', method: RequestMethod.POST },
        { path: 'user/sendUserOtp', method: RequestMethod.GET },
        { path: 'user/verifyUserOtp', method: RequestMethod.POST },
        { path: 'user/forgetPin', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
        { path: 'qr/getAll', method: RequestMethod.GET }, // TODO remove it in production
      )
      .forRoutes('*');

    consumer
      .apply(IsVerifiedMiddleware)
      .exclude(
        { path: 'user/createCard', method: RequestMethod.POST }, // TODO remove it in production
        { path: 'user/scan', method: RequestMethod.GET },
        { path: 'user/logIn', method: RequestMethod.POST },
        { path: 'user/verifyPin', method: RequestMethod.POST },
        { path: 'user/sendUserOtp', method: RequestMethod.GET },
        { path: 'user/verifyUserOtp', method: RequestMethod.POST },
        { path: 'user/forgetPin', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
        { path: 'qr/getAll', method: RequestMethod.GET }, // TODO remove it in production
      )
      .forRoutes('*');

    consumer.apply(MorganMiddleware).forRoutes('*');
  }
}
