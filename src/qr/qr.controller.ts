import {
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from 'src/guards/admin.guard';
import { QRService } from './qr.service';
import { SkipAdmin } from 'src/decorators/skip-admin-guard.decorator';

@Controller('qr')
export class QrController {
  constructor(private qrService: QRService) {}
  @Get('/getAll')
  @SkipAdmin() // TODO remove it when production
  // @UseGuards(AdminAuthGuard) // TODO active in production
  async getQrs(@Query('limit') limit: number = 4, @Res() res) {
    try {
      const qrs = await this.qrService.getQrs(limit);

      return res.json({
        responseMessage: 'QRs retrieved  successfully',
        responseCode: 200,
        data: qrs,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(404).json({
          responseMessage: error.message,
          responseCode: 404,
        });
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
