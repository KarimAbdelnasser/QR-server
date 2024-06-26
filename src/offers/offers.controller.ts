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
import { UsersService } from 'src/users/users.service';

@Controller('offer')
@Serialize(OfferDto)
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    private readonly usersService: UsersService,
  ) {}

  // * ADMIN Routes
  @Post('/addOne')
  // @SkipAdmin() // TODO remove it when production
  @UseGuards(AdminAuthGuard) //TODO active in production
  async addOffer(@Body() body: CreateOfferDto, @Req() req, @Res() res) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('[/addOne] Unauthorized: Missing user token');
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
        throw new UnauthorizedException('[/addMany] Unauthorized: Missing user token');
      }

      if (!offers || offers.length === 0) {
        throw new BadRequestException('Missing required fields: offers');
      }

      const userId = req.user._id;

      const createdOffers = await this.offersService.addOffers(userId, offers);

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
        throw new UnauthorizedException('[/:id] Unauthorized: Missing user token');
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

  // * Offer Routes
  @Get('/categories')
  @SkipAdmin()
  async getAllCategories(@Res() res, @Req() req) {
    try {
      // const user = await this.usersService.findOne(req.user._id);

      // const categories = await this.offersService.getAllCategories();

      // return res.json({
      //   responseMessage: 'Categories retrieved successfully',
      //   responseCode: 200,
      //   data: categories,
      // });
      return res.json({
        "responseMessage": "Categories retrieved successfully",
        "responseCode": 200,
        "data": [
            {
                "categoryNumber": 1,
                "category": "المطاعم و الكافيهات"
            },
            {
                "categoryNumber": 2,
                "category": "الخدمات الطبية"
            },
            {
                "categoryNumber": 3,
                "category": "الفنادق"
            },
            {
                "categoryNumber": 4,
                "category": "البواخر السياحية"
            },
            {
                "categoryNumber": 5,
                "category": "الملابس والأحذية"
            },
            {
                "categoryNumber": 6,
                "category": "الحلويات"
            },
            {
                "categoryNumber": 7,
                "category": "مفروشات و اثاث و مستلزمات منزلية"
            },
            {
                "categoryNumber": 8,
                "category": "الأثاث المكتبي"
            },
            {
                "categoryNumber": 9,
                "category": "خدمات متنوعة"
            },
            {
                "categoryNumber": 10,
                "category": "الاجهزة الالكترونية"
            },
            {
                "categoryNumber": 11,
                "category": "خدمات السيارات"
            },
            {
                "categoryNumber": 12,
                "category": "صالات الالعاب الرياضية"
            },
            {
                "categoryNumber": 13,
                "category": "خدمات ترفيهية"
            },
            {
                "categoryNumber": 14,
                "category": "خدمات تعليمية"
            },
            {
                "categoryNumber": 15,
                "category": "تجميل و تصفيف"
            }
        ]
    })
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('/brands')
  @SkipAdmin()
  async getAllBrands(
    @Req() req,
    @Res() res,
    @Query('category') category: number,
  ) {
    try {
      const user = await this.usersService.findOne(req.user._id);

      const brands = await this.offersService.getAllBrands(
        category,
        user.userType,
      );
      return res.json({
        responseMessage: 'Brands retrieved successfully',
        responseCode: 200,
        data: brands,
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
        throw new UnauthorizedException('[/getOffers] Unauthorized: Missing user token');
      }

      const user = await this.usersService.findOne(req.user._id);

      const offers = await this.offersService.getOffers(limit, user.userType);

      return res.json({
        responseMessage: 'Offers retrieved successfully',
        responseCode: 200,
        otpStatus: user.otpStatus,
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
    @Req() req,
    @Res() res,
    @Query('limit') limit: number = 10,
  ) {
    try {
      if (!brand) {
        throw new BadRequestException(
          '[/getByBrand] Bad request: Missing brand query parameter',
        );
      }
      const user = await this.usersService.findOne(req.user._id);

      const offers = await this.offersService.getOffersByBrand(
        brand,
        user.userType,
        limit,
      );

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
  async getOffersByCategory(
    @Query('category') category: string,
    @Res() res,
    @Req() req,
    @Query('limit') limit: number = 10,
  ) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('[/getByCategory] Unauthorized: Missing user token');
      }

      if (!category) {
        throw new BadRequestException(
          'Bad request: Missing category query parameter',
        );
      }

      const user = await this.usersService.findOne(req.user._id);

      const offers = await this.offersService.getOffersByCategory(
        category,
        user.userType,
        limit,
      );

      return res.json({
        responseMessage: 'Offers retrieved successfully',
        responseCode: 200,
        otpStatus: user.otpStatus,
        data: offers,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        return res.status(400).json({
          errorMessage: error.message,
          errorCode: 400,
        });
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('/getByCategoryNum')
  @SkipAdmin()
  async getOffersByCategoryNumber(
    @Query('categoryNum') categoryNum: string,
    @Res() res,
    @Req() req,
    @Query('limit') limit: number = 10,
  ) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('[/getByCategoryNum] Unauthorized: Missing user token');
      }

      if (!categoryNum) {
        throw new BadRequestException(
          'Bad request: Missing category query parameter',
        );
      }
      const user = await this.usersService.findOne(req.user._id);

      const offers = await this.offersService.getOffersByCategoryNumber(
        Number(categoryNum),
        user.userType,
        limit,
      );

      return res.json({
        responseMessage: 'Offers retrieved successfully',
        responseCode: 200,
        otpStatus: user.otpStatus,
        data: offers,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        return res.status(400).json({
          errorMessage: error.message,
          errorCode: 400,
        });
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
