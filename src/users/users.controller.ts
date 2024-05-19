import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserDto } from './dtos/user.dto';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CreateUserDto } from './dtos/create-user-dto';
import { UsersService } from './users.service';
import { AdminAuthGuard } from '../guards/admin.guard';
import { SkipAdmin } from '../decorators/skip-admin-guard.decorator';
import { QRService } from '../qr/qr.service';
import { config } from '../config/config';
import { AuthService } from './auth.service';
import commonLib from 'common-package';
import { logger } from 'src/utility/logger';

@Controller('user')
@Serialize(UserDto)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private qrService: QRService,
    private authService: AuthService,
  ) {}

  // * ADMIN Routes
  @Post('/createCard')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) // TODO active in production
  async createCard(@Body() body: CreateUserDto, @Res() res, @Req() req) {
    const existUser = await this.usersService.findOneByEmail(req.body.email);

    if (existUser) {
      throw new ConflictException('email in use!');
    }

    const { user, token } = await this.usersService.create(
      body.userName,
      body.email,
      body.phoneNumber,
      body.userType,
      body.otpStatus,
      body.isVerified,
      body.isAdmin,
    );

    const url = `${config.url}/valid?userId=${user.id}`;

    const qrCode = await this.qrService.generateQRCode(url, user.id.toString());

    const qrCodeString = qrCode.toString('base64');

    await this.qrService.saveQr(qrCodeString, String(user.id), token);

    res.header('auth-token', token).json({
      userName: `${user.userName}`,
      cardNumber: `${user.cardNumber}`,
      token: token,
      qrCode: qrCodeString,
    });
  }

  @Post('/activateUser')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) // TODO active in production
  async verifyUser(@Body() body, @Res() res) {
    const email = body.email;

    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      return res.status(400).json({
        responseMessage: 'User not found',
        responseCode: 400,
      });
    }
    if (user.isVerified) {
      throw new BadRequestException('User is already activated');
    }

    user.isVerified = true;

    await user.save();

    const token = await this.authService.generateAppJwtToken(
      user.id,
      user.isVerified,
      user.isAdmin,
      user.cardNumber,
    );

    return res.json({
      responseMessage: 'تم تفعيل الكارت',
      responseCode: 200,
      token: token,
    });
  }

  @Patch('/deactivate')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) // TODO active in production
  async deactivateUser(@Body() body, @Res() res) {
    try {
      const deactivatedUser = await this.usersService.deactivateCard(
        body.email,
      );

      return res.json({
        responseMessage: 'تم إيقاف تفعيل الكارت',
        responseCode: 200,
        data: deactivatedUser,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(404).json({
          responseMessage: 'Not Found',
          responseCode: 404,
          error: error.message,
        });
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  // * User Routes
  @Get('/scan')
  @SkipAdmin()
  async scanQr(@Query('userId') queryUserId: string, @Req() req, @Res() res) {
    if (!queryUserId) {
      throw new UnauthorizedException('QueryUserId missing');
    }

    try {
      console.log(queryUserId);
      const user = await this.usersService.findOne(queryUserId.toString());

      if (!user.isVerified) {
        return res.status(400).json({
          responseMessage: 'الكارت غير صالح',
          responseCode: 400,
        });
      }

      const token = await this.authService.generateAppJwtToken(
        user.id,
        user.isVerified,
        user.isAdmin,
        user.cardNumber,
      );

      return res.header('auth-token', token).json({
        responseMessage: 'الكارت صالح',
        responseCode: 200,
        token: token,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post('/logIn')
  @SkipAdmin()
  async logIn(@Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Unauthorized');
      }

      const user = await this.usersService.findOne(req.user._id.toString());

      if (user.isLoggedIn) {
        return res.status(400).json({
          responseMessage: 'لقت قمت بإنشاء رقم سري من قبل!',
          responseCode: 400,
        });
      }

      const hashedPin = await this.authService.hashPin(req.body.pin);

      user.pin = hashedPin;

      user.isLoggedIn = true;

      await user.save();

      return res.status(200).json({
        responseMessage: 'تم إنشاء الرقم السري',
        responseCode: 200,
      });

      // ! Send OTP in message
      // await commonLib.notifications.sendSMS(phoneNumber, otp, msg);
      // console.log(`OTP ${otp}has been sent to ${phoneNumber}`, otp);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post('/sendOtp')
  @SkipAdmin()
  async sendOtp(@Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Unauthorized');
      }

      const user = await this.usersService.findOne(req.user._id.toString());

      if (user.otp) {
        return res.status(400).json({
          responseMessage: 'لقت قمت بإنشاء رقم صالح ولم ينهي بعد!',
          responseCode: 400,
        });
      }

      const phoneNumber = user.phoneNumber;

      const otp = await this.authService.generateUniqueOtp();

      const msg = 'OTP الخاص بك :';

      user.otp = otp;

      await user.save();

      // ! Send OTP in message
      // await commonLib.notifications.sendSMS(phoneNumber, otp, msg);
      // console.log(`OTP ${otp}has been sent to ${phoneNumber}`, otp);

      return res.status(200).json({
        responseMessage: 'تم إرسال OTP',
        responseCode: 200,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post('/verifyOtp')
  @SkipAdmin()
  async verifyOtp(@Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Unauthorized');
      }

      const user = await this.usersService.findOne(req.user._id.toString());

      if (user.isLoggedIn) {
        return res.status(400).json({
          responseMessage: 'لقد قمت بتسجيل الدخول مسبقاً!',
          responseCode: 400,
        });
      }

      const otp = req.body.otp;

      if (otp === user.otp) {
        user.otp = '';
        user.isLoggedIn = true;
        await user.save();

        return res.status(200).json({
          responseMessage: 'OTP مطابق',
          responseCode: 200,
        });
      }

      return res.status(400).json({
        responseMessage: 'غير مطابق OTP',
        responseCode: 400,
      });
    } catch (error) {
      logger.error(`[verifyOtp] Error verifying OTP: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Delete('/remove/:id')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) // TODO active in production
  async removeOne(@Param('id') id: string, @Res() res) {
    const pannedUser = await this.usersService.removeOne(id);
    return res.json({
      ' message': `User ${pannedUser.userName || pannedUser.email} removed successfully`,
    });
  }
}
