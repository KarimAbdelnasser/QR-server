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
import { VerifyOtpDto } from './dtos/verifyOtp.dto';
import { OtpAndPinDto } from './dtos/otpAndPin.dto';

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
      const pinRegex = /^\d{6}$/;
      if (!body.pin || !pinRegex.test(body.pin)) {
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

  @Delete('/remove/:id')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) // TODO active in production
  async removeOne(@Param('id') id: string, @Res() res) {
    const pannedUser = await this.usersService.removeOne(id);
    return res.json({
      ' message': `User ${pannedUser.userName || pannedUser.email} removed successfully`,
    });
  }

  // * User Routes
  @Get('/scan')
  @SkipAdmin()
  async scanQr(@Query('userId') queryUserId: string, @Res() res) {
    if (!queryUserId) {
      throw new UnauthorizedException('[/scan] Unauthorized: Missing Query UserId');
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

      if (user.userType === 'A') {
        return res.json({
          responseMessage: 'الكارت صالح',
          responseCode: 200,
          sign: true,
          isLoggedIn: user.isLoggedIn,
          userType: user.userType,
          otpStatus: user.otpStatus,
          cardNumber: user.cardNumber,
          nextStepData:{
            userId:user.id
          }
        });
      } else {
        const returnJson = await this.usersService.returnCases(user.id);

        return res.json(returnJson);
      }
    } catch (error) {
      throw new InternalServerErrorException('Invalid QR Code: ', error.message);
    }
  }

// * First time logIn
  @Post('/logIn')
  @SkipAdmin()
  async logIn(@Query('userId') queryUserId: string, @Res() res, @Body() body: OtpAndPinDto) {
    try {
      if (!queryUserId) {
        throw new UnauthorizedException('[/logIn] Unauthorized: Missing Query UserId');
      }

      if (!isValidObjectId(queryUserId)) {
        return res.status(401).json({
          responseMessage: 'الكارت غير موجود',
          responseCode: 401,
          sign: false,
        });
      }

      const user = await this.usersService.findOne(queryUserId.toString());

      if (user.isLoggedIn) {
        return res.status(400).json({
          responseMessage: 'لقد قمت بإنشاء رقم سري من قبل!',
          responseCode: 400,
        });
      }

      const pin = body.pin;

      const hashedPin = await this.authService.hashPin(Number(pin));

      user.pin = hashedPin;

      user.isLoggedIn = true;

      await user.save();

      const token = await this.authService.generateAppJwtToken(
        user.id,
        user.isVerified,
        user.isAdmin,
        user.cardNumber,
      );

      return res.status(200).json({
        responseMessage: 'تم إنشاء الرقم السري',
        responseCode: 200,
        token: token
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('/verifyPin')
  @SkipAdmin()
  async verifyPin(@Query('userId') queryUserId: string, @Body() body: OtpAndPinDto, @Res() res) {
    try{
      if (!queryUserId) {
        throw new UnauthorizedException('[/verifyPin] Unauthorized: Missing Query UserId');
      }

      if (!isValidObjectId(queryUserId)) {
        return res.status(401).json({
          responseMessage: 'الكارت غير موجود',
          responseCode: 401,
          sign: false,
        });
      }
  
      const userId = queryUserId.toString();
  
      const enteredPin = body.pin;
  
      const user = await this.usersService.findOne(userId);
  
      const compare = await this.authService.comparePin(enteredPin, user.pin);
  
      if (compare) {
        if(!user.isLoggedIn){
          return res.json({
            responseMessage: 'لقد قمت بتسجيل دخولك لأول مرة برجاء تعيين رقم التعريف الشخصي الجديد',
            responseCode: 200,
            isLoggedIn:user.isLoggedIn
          });
        }

        const token = await this.authService.generateAppJwtToken(
          user.id,
          user.isVerified,
          user.isAdmin,
          user.cardNumber,
        );

        return res.json({
          responseMessage: 'الرقم الذي أدخلته مطابق جاري إعاده توجيهك',
          responseCode: 200,
          isLoggedIn:user.isLoggedIn,
          token:token
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

//* Forget Pin Routes
  @Get('/sendUserOtp')
  @SkipAdmin()
  async sendUserOtp(@Query('userId') queryUserId: string, @Res() res) {
    try {
      if (!queryUserId) {
        throw new UnauthorizedException('[/sendUserOtp] Unauthorized: Missing Query UserId');
      }

      if (!isValidObjectId(queryUserId)) {
        return res.status(401).json({
          responseMessage: 'الكارت غير موجود',
          responseCode: 401,
          sign: false,
        });
      }

      // Check if the user has an active offer
      const existingActiveOtp =
        await this.usersService.findActiveOtpByUserId(
          queryUserId.toString(),
        );
      if (existingActiveOtp&&!existingActiveOtp.otpVerified) {
          return res.status(400).json({
            responseMessage: ' لقد قمت بطلب رمز سابقاً لم ينتهى ولم تقم بتفعيله!',
            responseCode: 400,
        });
      }

      const user = await this.usersService.findOne(queryUserId.toString())

      if(!user.isLoggedIn){
        throw new BadRequestException("لم تقم بتسجيل الدخول لأول مرة بعد!");
      }

      const phoneNumber = user.phoneNumber;
      console.log("🚀 ~ UsersController ~ sendOtp ~ phoneNumber:", phoneNumber)

      const otp = await this.authService.generateUniqueOtp();

      console.log("🚀 ~ UsersController ~ sendOtp ~ otp:", otp)

      const msg = `OTP الخاص بك : ${otp}`;   

      await this.usersService.createActiveOtp(
        queryUserId.toString(),
        otp,
      );

      // Send OTP in message
      // await commonLib.notifications.sendSMS(phoneNumber, msg, true);
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
  async verifyUserOtp(@Query('userId') queryUserId: string, @Res() res, @Body() body: VerifyOtpDto) {
    try {
      if (!queryUserId) {
        throw new UnauthorizedException('[/verifyUserOtp] Unauthorized: Missing Query UserId');
      }

      if (!isValidObjectId(queryUserId)) {
        return res.status(401).json({
          responseMessage: 'الكارت غير موجود',
          responseCode: 401,
          sign: false,
        });
      }

      const userId = queryUserId.toString();
      const otp = body.otp;

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

  @Post('/forgetPin')
  @SkipAdmin()
  async forgetPin(@Query('userId') queryUserId: string, @Body() body: OtpAndPinDto, @Res() res) {
    try {
      if (!queryUserId) {
        throw new UnauthorizedException('[/verifyUserOtp] Unauthorized: Missing Query UserId');
      }

      if (!isValidObjectId(queryUserId)) {
        return res.status(401).json({
          responseMessage: 'الكارت غير موجود',
          responseCode: 401,
          sign: false,
        });
      }

      if(!body.newPin){
        throw new BadRequestException("Missing newPin!");
      }

      const userId = queryUserId.toString();
      const newPin = body.newPin;

      const user = await this.usersService.findOne(userId);

      if (!user) {
        return res.status(404).json({
          responseMessage: 'المستخدم غير موجود',
          responseCode: 404,
        });
      }

      user.pin = await this.authService.hashPin(Number(newPin));
      await user.save();

      return res.status(200).json({
        responseMessage: 'تم إعادة تعيين رقم التعريف الشخصي بنجاح',
        responseCode: 200,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

//* Redeem Offer routes
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
      // await commonLib.notifications.sendSMS(phoneNumber, msg, true);
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
  async verifyOtp(@Req() req, @Res() res, @Body() body: VerifyOtpDto) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('[/verifyOtp] Unauthorized: Missing user token');
      }

      const userId = req.user._id.toString();
      const otp = body.otp;

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
}
