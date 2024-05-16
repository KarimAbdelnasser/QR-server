import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user.schema';
import { Model } from 'mongoose';
import { UserDto } from './dtos/user.dto';
import { logger } from 'src/utility/logger';
import { Qr } from 'src/qr/qr.schema';
import { config } from 'src/config/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Qr.name) private readonly qrModel: Model<Qr>,
    private authService: AuthService,
  ) {}

  async create(
    userName: string,
    email: string,
    secretKey: string,
    isVerified?: boolean,
  ): Promise<{ user: UserDto; token: string }> {
    try {
      // const hashedPin = await this.authService.hashPin(pin);

      if (!userName) {
        userName = await this.authService.generateUniqueUsername();
      }

      const generatedCard = await this.authService.generateUniqueCardNumber();

      const newUser = await new this.userModel({
        userName,
        email,
        cardNumber: generatedCard,
        secretKey,
        isVerified: isVerified || false,
      });

      await newUser.save();

      const token = await this.authService.generateScanJwtToken(
        newUser.id,
        newUser.isVerified,
        newUser.isAdmin,
      );

      const userDto: UserDto = {
        id: newUser.id,
        userName: newUser.userName,
        email: newUser.email,
        cardNumber: newUser.cardNumber,
        isVerified: newUser.isVerified,
        isAdmin: newUser.isAdmin,
      };

      logger.info(
        `[create] New user created successfully with id: ${newUser.id}`,
      );

      return { user: userDto, token };
    } catch (error) {
      logger.error(
        `[create] Error creating a new user: ${(error as Error).message}`,
      );

      throw new InternalServerErrorException(
        `Could not create user : ${error.message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      if (!id) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      logger.info(`findOne] Finding user with id: ${id}`);

      return this.userModel.findById(id);
    } catch (error) {
      logger.error(`[findOne] Error find a user: ${(error as Error).message}`);

      throw new InternalServerErrorException(
        `Could not find : ${error.message}`,
      );
    }
  }

  async findOneBySecret(secretKey: any) {
    try {
      if (!secretKey) {
        throw new NotFoundException(`User not found!`);
      }
      const exist = await this.userModel.findOne({ secretKey: secretKey });
      if (exist) {
        return true;
      }
    } catch (error) {
      logger.error(
        `[findOneBySecret] Error find a user: ${(error as Error).message}`,
      );

      throw new InternalServerErrorException(
        `Could not find : ${error.message}`,
      );
    }
  }

  async findOneByEmail(email: string) {
    try {
      if (!email) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

      logger.info(`[findOneByEmail] Finding user by email: ${email}`);

      return await this.userModel.findOne({ email });
    } catch (error) {
      logger.error(
        `[findOneByEmail] Error find a user: ${(error as Error).message}`,
      );

      throw new InternalServerErrorException(
        `Could not find : ${error.message}`,
      );
    }
  }

  async saveOtp(id: string, otp: string) {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      user.otp.push(otp);

      return await user.save();
    } catch (error) {
      logger.error(
        `[saveOtp]Error updating OTP for user: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        `Failed to update OTP for user: ${error.message}`,
      );
    }
  }

  async usedOtp(userId: string, otp: string): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      const isOtpUsed = user.otp.includes(otp);

      return isOtpUsed;
    } catch (error) {
      logger.error(
        `[usedOtp]Error finding user or OTP: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        `Failed to check OTP usage: ${error.message}`,
      );
    }
  }

  async deactivateCard(email: string): Promise<User> {
    try {
      const user = await this.findOneByEmail(email);

      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

      console.log(user.isVerified, typeof user.isVerified);

      if (user.isVerified === false) {
        throw new BadRequestException('User is already deactivated');
      }

      user.isVerified = false;

      await user.save();

      logger.info(
        `[deactivateCard] User with email ${email} deactivated successfully`,
      );

      return user;
    } catch (error) {
      logger.error(
        `[deactivateCard] Error deactivating user: ${(error as Error).message}`,
      );

      throw new InternalServerErrorException(
        `Error deactivating user: ${(error as Error).message}`,
      );
    }
  }

  async removeOne(id: string) {
    const pannedUser = await this.userModel.findByIdAndDelete(id);
    return pannedUser;
  }
}
