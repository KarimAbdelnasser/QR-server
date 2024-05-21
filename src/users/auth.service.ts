import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { config } from 'src/config/config';
import { JwtService } from '@nestjs/jwt';
import * as QRCode from 'qrcode';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user.schema';
import { Model } from 'mongoose';
import { logger } from 'src/utility/logger';

@Injectable()
export class AuthService {
  private readonly generatedOtps: Set<string> = new Set();
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

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
    cardNumber: any,
  ): Promise<string> {
    try {
      const token = this.jwtService.sign(
        {
          _id: String(id),
          isVerified,
          isAdmin,
          cardNumber,
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
    cardNumber: string,
  ): Promise<string> {
    try {
      const token = this.jwtService.sign(
        {
          _id: id,
          isVerified,
          isAdmin,
          cardNumber,
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

  async generateUniqueOtp(): Promise<string> {
    try {
      let otp: string;
      do {
        otp = Math.floor(1000 + Math.random() * 9000).toString();
      } while (this.generatedOtps.has(otp));

      this.generatedOtps.add(otp);
      logger.info(`[generateUniqueOtp] Generated unique OTP: ${otp}`);
      return otp;
    } catch (error) {
      logger.error(
        `[generateUniqueOtp] Error generating OTP: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to generate unique OTP');
    }
  }

  async generateUniqueUsername(): Promise<string> {
    let defaultUsername = 'user';

    const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();

    defaultUsername += randomDigits;

    const user = await this.userModel
      .findOne({ userName: defaultUsername })
      .exec();

    if (user) {
      return this.generateUniqueUsername();
    }

    return defaultUsername;
  }

  async generateUniqueCardNumber(): Promise<string> {
    try {
      let cardNumber: string;
      do {
        cardNumber = '';
        for (let i = 0; i < 16; i++) {
          cardNumber += Math.floor(Math.random() * 10).toString();
        }
      } while (await this.isCardNumberExists(cardNumber));
      return cardNumber;
    } catch (error) {
      console.error(`Error generating unique card number: ${error.message}`);
      throw new Error('Failed to generate unique card number');
    }
  }

  async isCardNumberExists(cardNumber: string): Promise<boolean> {
    try {
      const existingUser = await this.userModel.findOne({ cardNumber });
      return !!existingUser;
    } catch (error) {
      logger.error(`Error checking card number existence: ${error.message}`);
      throw new Error('Failed to check existing of a card number');
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
