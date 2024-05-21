import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { Qr } from './qr.schema';
import { logger } from 'src/utility/logger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { config } from 'src/config/config';

@Injectable()
export class QRService {
  constructor(@InjectModel(Qr.name) private readonly qrModel: Model<Qr>) {}

  async generateQRCode(url: string, id: string): Promise<Buffer> {
    try {
      // const otpAuthUrl = authenticator.keyuri(email, 'White Card', secretKey);

      const qrCode = await QRCode.toBuffer(url);

      // const folderPath = path.join(__dirname, '..', 'images');
      // if (!fs.existsSync(folderPath)) {
      //   fs.mkdirSync(folderPath, { recursive: true });
      // }
      // const qrCodeFilePath = path.join(folderPath, `qr_${id}.png`);
      // fs.writeFileSync(qrCodeFilePath, qrCode);

      logger.info('[generateQRCode] QR code generated and saved successfully');

      return qrCode;
    } catch (error) {
      logger.error(
        '[generateQRCode] Error generating or saving QR code:',
        error,
      );
      throw new Error('Failed to generate or save QR code');
    }
  }

  async saveQr(
    qrValue: string,
    userId: string,
    cardNumber: number,
    userName: string,
    url: string,
  ) {
    try {
      const qrCode = await this.qrModel.create({
        userId,
        qrValue,
        cardNumber,
        userName,
        url,
      });

      const savedQr = await qrCode.save();

      logger.info(
        `[saveQr] QR code saved successfully for user with id: ${userId}`,
      );

      return { qrCode: savedQr };
    } catch (error) {
      logger.error(`[saveQr] Error find a user: ${(error as Error).message}`);

      throw new InternalServerErrorException(
        `Could not find : ${error.message}`,
      );
    }
  }

  async getQrs(limit: number): Promise<Qr[]> {
    try {
      const qrs = await this.qrModel
        .find({}, '-_id userName cardNumber qrValue url')
        .limit(limit)
        .exec();

      if (qrs.length === 0) {
        throw new NotFoundException(`There are no qrs available!`);
      }

      logger.info('[getQrs] QRs fetched successfully');

      return qrs;
    } catch (error) {
      logger.error(`[getQrs] Error fetching qrs: ${(error as Error).message}`);
      throw new NotFoundException(
        `QRs not found : ${(error as Error).message}`,
      );
    }
  }
}
