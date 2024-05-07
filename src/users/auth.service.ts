import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { config } from 'src/config/config';
import { JwtService } from '@nestjs/jwt';
import * as QRCode from 'qrcode';

@Injectable()
export class AuthService {
  private generatedCardNumbers: Set<string> = new Set<string>();

  constructor(private readonly jwtService: JwtService) {}

  async hashPin(pin: number): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(Number(config.salt));
      const hashedPin = await bcrypt.hash(String(pin), salt);
      return hashedPin;
    } catch (error) {
      console.error(`Error hashing pin: ${error.message}`);
      throw new Error('Failed to hash pin');
    }
  }

  async comparePin(newPin: string, oldPin: string) {
    try {
      const isPinValid = await bcrypt.compare(newPin, oldPin);
      return isPinValid;
    } catch (error) {
      console.error(`Error comparing pins: ${error.message}`);
      throw new Error('Failed to compare pins');
    }
  }

  async generateScanJwtToken(
    id: string,
    isVerified: boolean,
    isAdmin: boolean,
  ): Promise<string> {
    try {
      const token = this.jwtService.sign(
        {
          _id: String(id),
          isVerified,
          isAdmin,
        },
        {
          secret: config.scanJwt,
        },
      );
      return token;
    } catch (error) {
      console.error(`Error generating scan JWT token: ${error.message}`);
      throw new Error('Failed to generate scan JWT token');
    }
  }

  async generateAppJwtToken(
    id: string,
    isVerified: boolean,
    isAdmin: boolean,
  ): Promise<string> {
    try {
      const token = this.jwtService.sign(
        {
          _id: String(id),
          isVerified,
          isAdmin,
        },
        {
          secret: config.appJwt,
          expiresIn: '1h',
        },
      );
      return token;
    } catch (error) {
      console.error(`Error generating app JWT token: ${error.message}`);
      throw new Error('Failed to generate app JWT token');
    }
  }

  async generateUniqueCardNumber(): Promise<string> {
    try {
      let cardNumber: string;
      do {
        cardNumber = '';
        for (let i = 0; i < 16; i++) {
          cardNumber += Math.floor(Math.random() * 10).toString();
        }
      } while (this.generatedCardNumbers.has(cardNumber));
      this.generatedCardNumbers.add(cardNumber);
      return cardNumber;
    } catch (error) {
      console.error(`Error generating unique card number: ${error.message}`);
      throw new Error('Failed to generate unique card number');
    }
  }

  async generateQRCode(data: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(data);
      return qrCodeDataURL;
    } catch (error) {
      console.error(`Error generating QR code: ${error.message}`);
      throw new Error('Failed to generate QR code');
    }
  }
}
