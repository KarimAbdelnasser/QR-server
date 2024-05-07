import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
  Res,
  Param,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { Offer } from './offer.schema';
import { AdminAuthGuard } from '../guards/admin.guard';
import { SkipAdmin } from '../decorators/skip-admin-guard.decorator';
import { OfferDto } from './dtos/offer.dto';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CreateOfferDto } from './dtos/create-offer-dto';

@Controller('offer')
@Serialize(OfferDto)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post('/addOne')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) //TODO active in production
  async addOffer(@Body() body: CreateOfferDto, @Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Unauthorized: Missing user token');
      }

      if (!req.body.expiresAt) {
        throw new BadRequestException('Missing expire date!');
      }

      const {
        category,
        categoryNumber,
        offerName,
        offerPercentage,
        offerDescription,
        expiresAt,
      } = body;

      const newOffer = await this.offersService.addOffer(
        req.user._id,
        category,
        categoryNumber,
        offerName,
        offerPercentage,
        offerDescription,
        expiresAt,
      );

      console.log(
        '🚀 ~ OffersController ~ addOffer ~ newOffer:',
        typeof newOffer,
      );

      return res.json({
        responseMessage: 'Offer added successfully',
        responseCode: 200,
        data: newOffer,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('/addMany')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) // TODO active in production
  async addOffers(@Body('offers') offers: Offer[], @Res() res, @Req() req) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Unauthorized: Missing user token');
      }

      if (!offers || offers.length === 0) {
        throw new BadRequestException('Missing required fields: offers');
      }

      const userId = req.user._id;

      const createdOffers = await this.offersService.addOffers(userId, offers);

      console.log(
        '🚀 ~ OffersController ~ addOffers ~ createdOffers:',
        typeof createdOffers,
      );

      return res.json({
        responseMessage: 'Offers added successfully',
        responseCode: 200,
        data: createdOffers,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Patch('/:id')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) // TODO active in production
  async editOffer(
    @Param('id') offerId: string,
    @Body() updatedOfferData: Partial<Offer>,
    @Res() res,
    @Req() req,
  ) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Unauthorized: Missing user token');
      }

      const editedOffer = await this.offersService.editOffer(
        offerId,
        updatedOfferData,
      );
      if (!editedOffer) {
        throw new NotFoundException(`Offer with ID ${offerId} not found`);
      }
      return res.json({
        responseMessage: 'Offer updated successfully',
        responseCode: 200,
        data: editedOffer,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        return res.status(400).json({
          responseMessage: 'Bad request',
          responseCode: 400,
          error: error.message,
        });
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('/categories')
  @SkipAdmin()
  async getAllCategories(@Res() res) {
    try {
      const categories = await this.offersService.getAllCategories();
      return res.json({
        responseMessage: 'Categories retrieved successfully',
        responseCode: 200,
        data: categories,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('/getOffers')
  @SkipAdmin()
  async getOffersByUserId(
    @Req() req,
    @Res() res,
    @Query('limit') limit: number = 10,
  ) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Unauthorized: Missing user token');
      }

      const offers = await this.offersService.getOffers(limit);

      console.log('🚀 ~ OffersController ~ offers:', typeof offers);

      return res.json({
        responseMessage: 'Offers retrieved successfully',
        responseCode: 200,
        data: offers,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('/getByBrand')
  @SkipAdmin()
  async getOffersByBrandName(
    @Query('brand') brand: string,
    @Res() res,
    @Query('limit') limit: number = 10,
  ) {
    try {
      if (!brand) {
        throw new BadRequestException(
          'Bad request: Missing brand query parameter',
        );
      }

      const offers = await this.offersService.getOffersByBrand(brand, limit);

      console.log('🚀 ~ OffersController ~ offers:', typeof offers);

      return res.json({
        responseMessage: 'Offers retrieved successfully',
        responseCode: 200,
        data: offers,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('/getByCategory')
  @SkipAdmin()
  async getOffersByCategoryNumber(
    @Query('category') category: string,
    @Res() res,
    @Req() req,
    @Query('limit') limit: number = 10,
  ) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Unauthorized: Missing user token');
      }

      if (!category) {
        throw new BadRequestException(
          'Bad request: Missing category query parameter',
        );
      }

      const offers = await this.offersService.getOffersByCategory(
        category,
        limit,
      );
      console.log('🚀 ~ OffersController ~ offers:', typeof offers);

      return res.json({
        responseMessage: 'Offers retrieved successfully',
        responseCode: 200,
        data: offers,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        // Handle bad request error
        return res.status(400).json({
          errorMessage: error.message,
          errorCode: 400,
        });
      }
      // Handle other errors
      throw new InternalServerErrorException(error.message);
    }
  }
}
