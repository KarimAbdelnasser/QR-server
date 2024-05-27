import {
  BadRequestException,
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
import { ActiveOffer } from './activeOffer.schema';
import { ActiveOtp } from './activeOtp.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Qr.name) private readonly qrModel: Model<Qr>,
    @InjectModel(ActiveOffer.name) private readonly activeOfferModel: Model<ActiveOffer>,
    @InjectModel(ActiveOtp.name) private readonly activeOtpModel: Model<ActiveOtp>,
    private authService: AuthService,
  ) {}

  async create(
    userName: string,
    email: string,
    phoneNumber: string,
    pin: string,
    userType: string,
    cardNumber: number,
    otpStatus?: string,
    isVerified?: boolean,
    isAdmin?: boolean,
  ): Promise<{ user: UserDto; token: string }> {
    try {
      const hashedPin = await this.authService.hashPin(Number(pin));

      if (!userName) {
        userName = await this.authService.generateUniqueUsername();
      }

      // const generatedCard = await this.authService.generateUniqueCardNumber();
      const generatedCard = cardNumber;

      let otpStatus;

      if (!otpStatus && userType === 'B') {
        otpStatus = 'enable';
      }

      const newUser = await new this.userModel({
        userName,
        email,
        cardNumber: generatedCard,
        otpStatus: otpStatus,
        pin: hashedPin,
        userType: userType,
        phoneNumber: phoneNumber,
        isVerified: isVerified || false,
        isAdmin: isAdmin || false,
      });

      await newUser.save();

      const token = await this.authService.generateAppJwtToken(
        newUser.id,
        newUser.isVerified,
        newUser.isAdmin,
        generatedCard.toString(),
      );

      const userDto: UserDto = {
        id: newUser.id,
        userName: newUser.userName,
        email: newUser.email,
        pin: newUser.pin,
        cardNumber: newUser.cardNumber,
        isVerified: newUser.isVerified,
        isAdmin: newUser.isAdmin,
        userType: newUser.userType,
        phoneNumber: newUser.phoneNumber,
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

  async createActiveOtp(
    userId: string,
    otp: string,
  ): Promise<ActiveOtp> {
    const newActiveOtp = new this.activeOtpModel({
      userId,
      otp,
      otpVerified: false,
    });
    return newActiveOtp.save();
  }

  async createActiveOffer(
    userId: string,
    brand: string,
    otp: string,
  ): Promise<ActiveOffer> {
    const newActiveOffer = new this.activeOfferModel({
      userId,
      brand,
      otp,
      otpVerified: false,
    });
    return newActiveOffer.save();
  }

  async findOne(id: string) {
    try {
      if (!id) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      logger.info(`[findOne] Finding user with id: ${id}`);

      return this.userModel.findById(id);
    } catch (error) {
      logger.error(`[findOne] Error find a user: ${(error as Error).message}`);

      throw new InternalServerErrorException(
        `Could not find : ${error.message}`,
      );
    }
  }

  async findActiveOfferByUserId(userId: string): Promise<ActiveOffer | null> {
    logger.info(`[findActiveOfferByUserId] Finding activeOffer with userId: ${userId}`);
    return this.activeOfferModel.findOne({ userId }).exec();
  }

  async findActiveOtpByUserId(userId: string): Promise<ActiveOtp | null> {
    logger.info(`[findActiveOtpByUserId] Finding activeOffer with userId: ${userId}`);
    return this.activeOtpModel.findOne({ userId }).exec();
  }

  async returnCases(id: string, token: string) {
    try {
      if (!id) {
        throw new NotFoundException(`User id missing!`);
      }

      const user = await this.findOne(id);

      if (!user) {
        throw new NotFoundException(`User not found!`);
      }

      const activeOffer = await this.findActiveOfferByUserId(id);
      let sign = true;

      if (!activeOffer) {
        return {
          responseMessage: 'لم يتم التصديق على اى عملية.',
          responseCode: 200,
          sign: false,
          userType: user.userType,
          otpStatus: user.otpStatus,
          cardNumber: user.cardNumber,
          token,
        };
      }

      let responseMessage;
      let responseCode = 200;
      let brand = activeOffer.brand;

      if (activeOffer.otpVerified) {
        responseMessage = `العملية مقبولة ل`;
      } else {
        responseMessage = `العملية غير مقبولة ل`;
        sign = false;
      }

      return {
        responseMessage,
        responseCode,
        sign: sign,
        activeOfferBrand: brand,
        userType: user.userType,
        otpStatus: user.otpStatus,
        cardNumber: user.cardNumber,
        token,
      };
    } catch (error) {
      logger.error(`[returnCases] Error : ${(error as Error).message}`);
      throw new InternalServerErrorException(
        `Could not return case : ${error.message}`,
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

  // async saveOtp(id: string, otp: string) {
  //   try {
  //     const user = await this.userModel.findById(id);
  //     if (!user) {
  //       throw new NotFoundException(`User with id ${id} not found`);
  //     }

  //     // user.otp.push(otp);

  //     return await user.save();
  //   } catch (error) {
  //     logger.error(
  //       `[saveOtp]Error updating OTP for user: ${(error as Error).message}`,
  //     );
  //     throw new InternalServerErrorException(
  //       `Failed to update OTP for user: ${error.message}`,
  //     );
  //   }
  // }

  // async usedOtp(userId: string, otp: string) {
  //   try {
  //     const user = await this.userModel.findById(userId);

  //     if (!user) {
  //       throw new NotFoundException(`User with id ${userId} not found`);
  //     }

  //     // const isOtpUsed = user.otp.includes(otp);

  //     // return isOtpUsed;
  //   } catch (error) {
  //     logger.error(
  //       `[usedOtp]Error finding user or OTP: ${(error as Error).message}`,
  //     );
  //     throw new InternalServerErrorException(
  //       `Failed to check OTP usage: ${error.message}`,
  //     );
  //   }
  // }

  async deactivateCard(email: string): Promise<User> {
    try {
      const user = await this.findOneByEmail(email);

      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

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
