import {
  Body,
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

@Controller('user')
@Serialize(UserDto)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private qrService: QRService,
    private authService: AuthService,
  ) {}

  @Post('/createCard')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) // TODO active in production
  async createCard(@Body() body: CreateUserDto, @Res() res) {
    const { user, token } = await this.usersService.create(
      body.userName,
      body.email,
      body.pin,
    );

    const url = `${config.url}/user/scan?credentials=${token}`;

    const qrCode = await this.qrService.generateQRCode(url);

    const qrCodeString = qrCode.toString('base64');
    await this.usersService.saveQr(qrCodeString, url, String(user.id));

    res.header('auth-token', token).json({
      userName: `${user.userName}`,
      cardNumber: `${user.cardNumber}`,
      url: url,
    });
  }

  @Patch('/deactivate/:cardNumber')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) // TODO active in production
  async deactivateUser(@Param('cardNumber') cardNumber: number, @Res() res) {
    try {
      const deactivatedUser =
        await this.usersService.deactivateCard(cardNumber);
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
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post('/verifyPin')
  @SkipAdmin()
  async verifyPin(@Body() body, @Req() req, @Res() res) {
    if (!req.user) {
      throw new UnauthorizedException('Unauthorized: Missing user token');
    }

    const userId = req.user._id;

    const enteredPin = body.pin;

    const user = await this.usersService.findOne(userId);

    const compare = await this.authService.comparePin(enteredPin, user.pin);

    if (compare) {
      return res.json({
        responseMessage: 'الرقم الذي أدخلته مطابق جاري إعاده توجيهك',
        responseCode: 200,
      });
    } else {
      return res.status(400).json({
        responseMessage: 'الرقم الذي أدخلته غير مطابق',
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
