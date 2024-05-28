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
// import commonLib from 'common-package';
import { isValidObjectId } from 'mongoose';

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
  @SkipAdmin() // TODO remove it when production
  // @UseGuards(AdminAuthGuard) // TODO active in production
  async createCard(@Body() body: CreateUserDto, @Res() res, @Req() req) {
    try{
      const existUser = await this.usersService.findOneByEmail(req.body.email);

      if (existUser) {
        throw new ConflictException('email in use!');
      }
      if (!body.pin || body.pin.length !== 6) {
        throw new BadRequestException('Invalid pin: must be 6 digits!');
      }
  
      const { user, token } = await this.usersService.create(
        body.userName,
        body.email,
        body.phoneNumber,
        body.pin,
        body.userType,
        body.cardNumber,
        body.otpStatus,
        body.isVerified,
        body.isAdmin,
      );
  
      const url = `${config.url}/valid?userId=${user.id}`;
  
      const qrCode = await this.qrService.generateQRCode(url, user.id.toString());
  
      const qrCodeString = qrCode.toString('base64');
  
      await this.qrService.saveQr(
        qrCodeString,
        String(user.id),
        body.cardNumber,
        body.userName,
        url,
      );
  
      res.header('auth-token', token).json({
        userName: `${user.userName}`,
        cardNumber: `${user.cardNumber}`,
        token: token,
        qrCode: qrCodeString,
      });
    }catch(error){
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('/activateUser')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) // TODO active in production
  async verifyUser(@Body() body, @Res() res) {
    try{
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
    }catch(error){
      throw new InternalServerErrorException(error.message);
    }
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
      throw new UnauthorizedException('[/scan] Unauthorized: Missing QueryUserId');
    }

    if (!isValidObjectId(queryUserId)) {
      return res.status(401).json({
        responseMessage: 'الكارت غير موجود',
        responseCode: 401,
        sign: false,
      });
    }

    try {
      const user = await this.usersService.findOne(queryUserId.toString());

      if (!user) {
        return res.status(401).json({
          responseMessage: 'الكارت غير موجود',
          responseCode: 401,
          sign: false,
        });
      }

      if (!user.isVerified) {
        return res.status(400).json({
          responseMessage: 'الكارت غير صالح',
          responseCode: 400,
          sign: false,
        });
      }

      const token = await this.authService.generateAppJwtToken(
        user.id,
        user.isVerified,
        user.isAdmin,
        user.cardNumber,
      );

      if (user.userType === 'A') {
        return res.header('auth-token', token).json({
          responseMessage: 'الكارت صالح',
          responseCode: 200,
          sign: true,
          userType: user.userType,
          otpStatus: user.otpStatus,
          cardNumber: user.cardNumber,
          token: token,
        });
      } else {
        const returnJson = await this.usersService.returnCases(user.id, token);

        return res.header('auth-token', token).json(returnJson);
      }
    } catch (error) {
      throw new InternalServerErrorException('Invalid QR Code: ', error.message);
    }
  }

  @Post('/verifyPin')
  @SkipAdmin()
  async verifyPin(@Body() body, @Req() req, @Res() res) {
    try{
      if (!req.user) {
        throw new UnauthorizedException('[/verifyPin] Unauthorized: Missing user token');
      }
  
      const userId = req.user._id;
  
      const enteredPin = body.pin;
  
      const user = await this.usersService.findOne(userId);
  
      const compare = await this.authService.comparePin(enteredPin, user.pin);
  
      if (compare) {
        return res.json({
          responseMessage: 'الرقم الذي أدخلته مطابق جاري إعاده توجيهك',
          responseCode: 200,
          isLoggedIn:user.isLoggedIn
        });
      } else {
        return res.status(400).json({
          responseMessage: 'الرقم الذي أدخلته غير مطابق',
          responseCode: 400,
        });
      }
    }catch(error){
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('/logIn')
  @SkipAdmin()
  async logIn(@Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('[/logIn] Unauthorized: Missing user token');
      }

      const user = await this.usersService.findOne(req.user._id.toString());

      if (user.isLoggedIn) {
        return res.status(400).json({
          responseMessage: 'لقد قمت بإنشاء رقم سري من قبل!',
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
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('/sendUserOtp')
  @SkipAdmin()
  async sendUserOtp(@Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('[/sendUserOtp] Unauthorized: Missing user token');
      }

      // Check if the user has an active offer
      const existingActiveOtp =
        await this.usersService.findActiveOtpByUserId(
          req.user._id.toString(),
        );
      if (existingActiveOtp&&!existingActiveOtp.otpVerified) {
          return res.status(400).json({
            responseMessage: ' لقد قمت بطلب رمز سابقاً لم ينتهى ولم تقم بتفعيله!',
            responseCode: 400,
        });
      }

      const user = await this.usersService.findOne(req.user._id.toString())

      const phoneNumber = user.phoneNumber;
      console.log("🚀 ~ UsersController ~ sendOtp ~ phoneNumber:", phoneNumber)

      const otp = await this.authService.generateUniqueOtp();

      console.log("🚀 ~ UsersController ~ sendOtp ~ otp:", otp)

      const msg = `OTP الخاص بك : ${otp}`;   

      await this.usersService.createActiveOtp(
        req.user._id.toString(),
        otp,
      );

      // Send OTP in message
      // await commonLib.notifications.sendSMS(phoneNumber, msg);
      console.log(`OTP ${otp} has been sent to ${phoneNumber}`, msg);

      return res.status(200).json({
        responseMessage: 'تم إرسال OTP',
        responseCode: 200,
      });
    } catch (error) {
      console.log('-------------------------------------------------------')
      console.log(error)
      console.log('-------------------------------------------------------')
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('/verifyUserOtp')
  @SkipAdmin()
  async verifyUserOtp(@Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('[/verifyUserOtp] Unauthorized: Missing user token');
      }

      const userId = req.user._id.toString();
      const otp = req.body.otp;

      const existingActiveOtp =
        await this.usersService.findActiveOtpByUserId(userId);

      if (!existingActiveOtp) {
        return res.status(400).json({
          responseMessage: 'هذا الطلب غير موجود!',
          responseCode: 400,
        });
      }

      if (otp === existingActiveOtp.otp) {
        await existingActiveOtp.deleteOne();

        return res.status(200).json({
          responseMessage: 'تم التحقق من OTP بنجاح.',
          responseCode: 200,
        });
      }

      return res.status(400).json({
        responseMessage: 'غير مطابق OTP',
        responseCode: 400,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('/sendOtp')
  @SkipAdmin()
  async sendOtp(@Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('[/sendOtp] Unauthorized: Missing user token');
      }

      const brand = req.body.brand;

      // Check if the user has an active offer
      const existingActiveOffer =
        await this.usersService.findActiveOfferByUserId(
          req.user._id.toString(),
        );
      if (existingActiveOffer) {
        if (existingActiveOffer.otpVerified) {
          return res.status(400).json({
            responseMessage: 'لقد قمت بالحصول على عرض اخر!',
            otpVerified: existingActiveOffer.otpVerified,
            responseCode: 400,
          });
        } else {
          return res.status(400).json({
            responseMessage:
              '(OTP) لقد قمت بالحصول على عرض اخر ولم تقم بتأكيد ال',
            otpVerified: existingActiveOffer.otpVerified,
            responseCode: 400,
          });
        }
      }

      const user = await this.usersService.findOne(req.user._id.toString())

      if(user.otpStatus==='disable') {
      throw new BadRequestException("This user can't get otp services!");
      }

      const phoneNumber = user.phoneNumber;
      console.log("🚀 ~ UsersController ~ sendOtp ~ phoneNumber:", phoneNumber)

      const otp = await this.authService.generateUniqueOtp();

      console.log("🚀 ~ UsersController ~ sendOtp ~ otp:", otp)

      const msg = `OTP الخاص بك : ${otp}`;   

      await this.usersService.createActiveOffer(
        req.user._id.toString(),
        brand,
        otp,
      );

      // Send OTP in message
      // await commonLib.notifications.sendSMS(phoneNumber, msg);
      console.log(`OTP ${otp} has been sent to ${phoneNumber}`, msg);

      return res.status(200).json({
        responseMessage: 'تم إرسال OTP',
        responseCode: 200,
      });
    } catch (error) {
      console.log('-------------------------------------------------------')
      console.log(error)
      console.log('-------------------------------------------------------')
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('/verifyOtp')
  @SkipAdmin()
  async verifyOtp(@Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('[/verifyOtp] Unauthorized: Missing user token');
      }

      const userId = req.user._id.toString();
      const otp = req.body.otp;

      const existingActiveOffer =
        await this.usersService.findActiveOfferByUserId(userId);

      if (!existingActiveOffer) {
        return res.status(400).json({
          responseMessage: 'لا يوجد لديك عرض حاليًا!',
          responseCode: 400,
        });
      }

      if (otp === existingActiveOffer.otp) {
        existingActiveOffer.otpVerified = true;
        await existingActiveOffer.save();

        return res.status(200).json({
          responseMessage: 'تم التحقق من OTP بنجاح',
          responseCode: 200,
        });
      }

      return res.status(400).json({
        responseMessage: 'غير مطابق OTP',
        responseCode: 400,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('/forgetPin')
  @SkipAdmin()
  async forgetPin(@Body() body, @Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('[/forgetPin] Unauthorized: Missing user token');
      }
      if(!body.newPin){
        throw new BadRequestException("Missing newPin!");
      }

      const userId = req.user._id;
      const newPin = body.newPin;

      const user = await this.usersService.findOne(userId);

      if (!user) {
        return res.status(404).json({
          responseMessage: 'المستخدم غير موجود',
          responseCode: 404,
        });
      }

      user.pin = await this.authService.hashPin(newPin);
      await user.save();

      return res.status(200).json({
        responseMessage: 'تم إعادة تعيين رقم التعريف الشخصي بنجاح',
        responseCode: 200,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
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
