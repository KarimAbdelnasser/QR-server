import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class QRService {
  async generateQRCode(data: string): Promise<Buffer> {
    try {
      const buffer = await QRCode.toBuffer(data);

      const folderPath = path.join(__dirname, '..', 'images');
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const qrCodeFilePath = path.join(folderPath, `qr_${Date.now()}.png`);
      fs.writeFileSync(qrCodeFilePath, buffer);

      return buffer;
    } catch (error) {
      console.error('Error generating or saving QR code:', error);
      throw new Error('Failed to generate or save QR code');
    }
  }
}
