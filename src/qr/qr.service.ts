import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { authenticator } from 'otplib';
import { Qr } from './qr.schema';
import { logger } from 'src/utility/logger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { config } from 'src/config/config';

@Injectable()
export class QRService {
  constructor(@InjectModel(Qr.name) private readonly qrModel: Model<Qr>) {}

  generateSecretKey(): string {
    return authenticator.generateSecret();
  }

  async generateQRCode(email: string, secretKey: string): Promise<Buffer> {
    try {
      const otpAuthUrl = authenticator.keyuri(email, 'White Card', secretKey);

      const qrCode = await QRCode.toDataURL(otpAuthUrl);

      const qrCodeBuffer = await QRCode.toBuffer(otpAuthUrl);

      const folderPath = path.join(__dirname, '..', 'images');
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const qrCodeFilePath = path.join(folderPath, `qr_${secretKey}.png`);
      fs.writeFileSync(qrCodeFilePath, qrCodeBuffer);

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

  async saveQr(qrValue: string, userId: string, token: string) {
    try {
      const url = `${config.url}/valid?credentials=${token}`;

      const qrCode = await this.qrModel.create({ userId, qrValue, url });

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

  async updateQr(userId: string, token: string) {
    try {
      const qr = await this.qrModel.findOneAndUpdate(
        { userId: userId },
        { url: `${config.url}/valid?credentials=${token}` },
        { new: true },
      );

      if (!qr) {
        throw new NotFoundException(`There is no qr available for this user!`);
      }

      logger.info('[updateQr] QR updated successfully');

      return qr;
    } catch (error) {
      logger.error(`[updateQr] Error updating qr: ${(error as Error).message}`);
      throw new NotFoundException(
        `QRs not found : ${(error as Error).message}`,
      );
    }
  }

  async getQrs(limit: number): Promise<Qr[]> {
    try {
      const qrs = await this.qrModel
        .find({}, '-_id userId url qrValue')
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
