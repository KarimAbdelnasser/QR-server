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
import { UpdateUserDto } from './dtos/update-user.dto';
import { logger } from 'src/utility/logger';
import { Qr } from 'src/qr/qr.schema';

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
    pin: number,
  ): Promise<{ user: UserDto; token: string }> {
    const user = await this.userModel.find({ email });

    if (user.length) {
      throw new ConflictException('email in use!');
    }

    try {
      const hashedPin = await this.authService.hashPin(pin);

      const generatedCard = await this.authService.generateUniqueCardNumber();

      const newUser = await new this.userModel({
        userName,
        email,
        cardNumber: generatedCard,
        pin: hashedPin,
        // isVerified: true, // TODO remove it in production. it's for dev env only!!
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
        pin: hashedPin,
        isAdmin: newUser.isAdmin,
      };

      return { user: userDto, token };
    } catch (error) {
      logger.error(`Error creating a new user: ${(error as Error).message}`);

      throw new InternalServerErrorException(
        `Could not create user : ${error.message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      if (!id) {
        return null;
      }
      return this.userModel.findById(id);
    } catch (error) {
      logger.error(`Error find a user: ${(error as Error).message}`);

      throw new InternalServerErrorException(
        `Could not find : ${error.message}`,
      );
    }
  }

  async saveQr(qrValue: string, url: string, userId: string) {
    try {
      const qrCode = await this.qrModel.create({ userId, qrValue, url });
      const savedQr = await qrCode.save();
      return { qrCode: savedQr };
    } catch (error) {
      logger.error(`Error find a user: ${(error as Error).message}`);

      throw new InternalServerErrorException(
        `Could not find : ${error.message}`,
      );
    }
  }

  async deactivateCard(cardNumber: number): Promise<User> {
    try {
      const user = await this.userModel.findOneAndUpdate(
        { cardNumber },
        { isVerified: false },
        { new: true },
      );
      if (!user) {
        throw new NotFoundException(
          `User with card number ${cardNumber} not found`,
        );
      }
      return user;
    } catch (error) {
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
