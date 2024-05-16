import { Module } from '@nestjs/common';
import { QrController } from './qr.controller';
import { QRService } from './qr.service';
import { QrSchema } from './qr.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Qr', schema: QrSchema }])],
  controllers: [QrController],
  providers: [QRService],
  exports: [QRService],
})
export class QrModule {}
