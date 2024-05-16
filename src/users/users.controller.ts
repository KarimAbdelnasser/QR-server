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
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { authenticator } from 'otplib';

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

    let secretKey;
    let existSecretKey;

    do {
      secretKey = await this.qrService.generateSecretKey();
      existSecretKey = await this.usersService.findOneBySecret(secretKey);
    } while (existSecretKey);

    const qrCode = await this.qrService.generateQRCode(body.email, secretKey);

    const { user, token } = await this.usersService.create(
      body.userName,
      body.email,
      secretKey,
      body.isVerified,
    );

    const qrCodeString = qrCode.toString('base64');

    await this.qrService.saveQr(qrCodeString, String(user.id), token);

    res.header('auth-token', token).json({
      userName: `${user.userName}`,
      cardNumber: `${user.cardNumber}`,
      qrCode: qrCode,
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

    const token = await this.authService.generateScanJwtToken(
      user.id,
      user.isVerified,
      user.isAdmin,
    );

    await this.qrService.updateQr(user.id.toString(), token);

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

      const user = await this.usersService.findOneByEmail(body.email);

      const token = await this.authService.generateScanJwtToken(
        user.id,
        user.isVerified,
        user.isAdmin,
      );

      await this.qrService.updateQr(user.id.toString(), token);

      return res.json({
        responseMessage: 'User deactivated successfully',
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
  async scanQr(
    @Query('credentials') queryCredentials: string,
    @Req() req,
    @Res() res,
  ) {
    if (!queryCredentials) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const decodedToken = jwt.verify(queryCredentials, config.scanJwt);

      req.user = decodedToken;

      if (!req.user.isVerified) {
        return res.status(400).json({
          responseMessage: 'الكارت غير صالح',
          responseCode: 400,
        });
      }

      const user = await this.usersService.findOne(req.user._id);

      const token = await this.authService.generateAppJwtToken(
        req.user._id,
        user.isVerified,
        user.isAdmin,
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

  @Post('/verifyCard')
  @SkipAdmin()
  async verifyPin(@Body() body, @Res() res) {
    const enteredOtp = body.otp;

    const email = body.email;

    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      return res.status(400).json({
        responseMessage: 'User not found',
        responseCode: 400,
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        responseMessage: 'User not verified!',
        responseCode: 401,
      });
    }

    const secretKey = user.secretKey;

    const isValidOTP = authenticator.verify({
      token: enteredOtp,
      secret: secretKey,
    });

    if (isValidOTP) {
      const token = await this.authService.generateAppJwtToken(
        user.id,
        user.isVerified,
        user.isAdmin,
      );

      const usedOtp = await this.usersService.usedOtp(user.id, enteredOtp);

      if (usedOtp) {
        return res.status(400).json({
          responseMessage:
            'الرقم الذي أدخلته تم استخدامه حاول مرة اخري برقم اخر',
          responseCode: 400,
        });
      }

      await this.usersService.saveOtp(user.id, enteredOtp);

      return res.json({
        responseMessage: 'الرقم الذي أدخلته صالح',
        responseCode: 200,
        token: token,
      });
    } else {
      return res.status(400).json({
        responseMessage: 'الرقم الذي أدخلته غير صالح',
        responseCode: 400,
      });
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
