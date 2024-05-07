import { Module } from '@nestjs/common';
import { QrController } from './qr.controller';
import { QRService } from './qr.service';

@Module({
  controllers: [QrController],
  providers: [QRService],
  exports: [QRService],
})
export class QrModule {}
