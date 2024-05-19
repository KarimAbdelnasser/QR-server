import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Offer } from './offer.schema';
import { logger } from '../utility/logger';

@Injectable()
export class OffersService {
  constructor(
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
  ) {}

  async addOffer(
    userId: string,
    category: string,
    categoryNumber: number,
    offerName: string,
    offerPercentage: number,
    offerDescription: string,
    expiresAt: string,
  ): Promise<Offer> {
    try {
      const expiresAtDate = new Date(expiresAt);

      const newOffer = new this.offerModel({
        userId,
        category,
        categoryNumber,
        offerName,
        offerPercentage,
        offerDescription,
        expiresAt: expiresAtDate,
      });

      const savedOffer = await newOffer.save();

      logger.info(
        `[addOffer] New offer added successfully with id: ${savedOffer._id}`,
      );

      return savedOffer;
    } catch (error) {
      logger.error(
        `[addOffer] Error adding offer: ${(error as Error).message}`,
      );

      throw new InternalServerErrorException(
        `Could not add offer: ${(error as Error).message}`,
      );
    }
  }

  async addOffers(userId: string, offers: Offer[]): Promise<Offer[]> {
    try {
      offers.forEach((offer) => (offer.userId = userId));

      const createdOffers = await this.offerModel.insertMany(offers);

      logger.info(`[addOffers] ${offers.length} offers added successfully`);

      return createdOffers;
    } catch (error) {
      logger.error(
        `[addOffers] Error adding offers: ${(error as Error).message}`,
      );

      throw new InternalServerErrorException(
        `Could not add offers: ${(error as Error).message}`,
      );
    }
  }

  async getAllCategories(userType: string): Promise<string[]> {
    try {
      const categories = await this.offerModel
        .distinct('category', { usersType: userType })
        .exec();

      logger.info(`[getAllCategories] Retrieved all categories: ${categories}`);

      return categories;
    } catch (error) {
      logger.error(
        `[getAllCategories] Error fetching categories: ${(error as Error).message}`,
      );

      throw new InternalServerErrorException(
        `Error fetching categories: ${(error as Error).message}`,
      );
    }
  }

  async getAllBrands(
    categoryNumber: number,
    userType: string,
  ): Promise<string[]> {
    try {
      const brands = await this.offerModel
        .distinct('offerName', { categoryNumber, usersType: userType })
        .exec();

      if (!brands.length) {
        throw new NotFoundException(
          'There are no category available with this category number!',
        );
      }

      logger.info(`[getAllBrands] Retrieved all brands : ${brands}`);

      return brands;
    } catch (error) {
      logger.error(
        `[getAllBrands] Error fetching brands: ${(error as Error).message}`,
      );

      throw new InternalServerErrorException(
        `Error fetching brands: ${(error as Error).message}`,
      );
    }
  }

  async getOffers(limit: number, userType: string): Promise<Offer[]> {
    try {
      const offers = await this.offerModel
        .find({ usersType: userType })
        .limit(limit)
        .exec();

      if (offers.length === 0) {
        throw new NotFoundException('There are no offers available.');
      }

      logger.info(`[getOffers] ${offers.length} offers retrieved successfully`);

      return offers;
    } catch (error) {
      logger.error(
        `[getOffers] Error fetching offers: ${(error as Error).message}`,
      );

      throw new NotFoundException(
        `Offers not found: ${(error as Error).message}`,
      );
    }
  }

  async getOffersByCategory(
    category: string,
    userType: string,
    limit: number,
  ): Promise<Offer[]> {
    try {
      const offers = await this.offerModel
        .find({ category, usersType: userType })
        .limit(limit)
        .exec();

      if (offers.length === 0) {
        throw new NotFoundException(
          `There are no offers available for category '${category}' and userType '${userType}'.`,
        );
      }

      logger.info(
        `[getOffersByCategory] ${offers.length} offers retrieved successfully for category '${category}' and userType '${userType}'`,
      );

      return offers;
    } catch (error) {
      logger.error(
        `[getOffersByCategory] Error fetching offers by category and userType: ${(error as Error).message}`,
      );

      throw new NotFoundException(
        `Offers not found for this category and userType: ${(error as Error).message}`,
      );
    }
  }

  async getOffersByCategoryNumber(
    categoryNumber: number,
    userType: string,
    limit: number,
  ): Promise<Offer[]> {
    try {
      const offers = await this.offerModel
        .find({ categoryNumber, usersType: userType })
        .limit(limit)
        .exec();

      if (offers.length === 0) {
        throw new NotFoundException(
          `There are no offers available for category number '${categoryNumber}' and userType '${userType}'.`,
        );
      }

      logger.info(
        `[getOffersByCategoryNumber] ${offers.length} offers retrieved successfully for category number '${categoryNumber}' and userType '${userType}'`,
      );

      return offers;
    } catch (error) {
      logger.error(
        `[getOffersByCategoryNumber] Error fetching offers by category number and userType: ${(error as Error).message}`,
      );

      throw new NotFoundException(
        `Offers not found for this category number and userType: ${(error as Error).message}`,
      );
    }
  }

  async getOffersByBrand(
    brand: string,
    userType: string,
    limit: number,
  ): Promise<Offer[]> {
    try {
      const offers = await this.offerModel
        .find({ offerName: brand, usersType: userType })
        .limit(limit)
        .exec();

      if (offers.length === 0) {
        throw new NotFoundException(
          `There are no offers available for this brand '${brand}' and userType '${userType}'.`,
        );
      }

      logger.info(
        `[getOffersByBrand] ${offers.length} offers retrieved successfully for brand '${brand}' and userType '${userType}'`,
      );

      return offers;
    } catch (error) {
      logger.error(
        `[getOffersByBrand] Error fetching offers by brand and userType: ${(error as Error).message}`,
      );

      throw new NotFoundException(
        `Offers not found for this brand and userType: ${(error as Error).message}`,
      );
    }
  }

  async editOffer(
    offerId: string,
    updatedOfferData: Partial<Offer>,
  ): Promise<Offer> {
    const allowedFields = [
      'category',
      'categoryNumber',
      'offerName',
      'offerPercentage',
      'offerDescription',
      'expiresAt',
    ];

    const invalidFields = Object.keys(updatedOfferData).filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      throw new BadRequestException(
        `Invalid fields: ${invalidFields.join(', ')}`,
      );
    }

    try {
      const offer = await this.offerModel.findByIdAndUpdate(
        offerId,
        updatedOfferData,
        { new: true },
      );

      if (!offer) {
        throw new NotFoundException(`Offer with ID ${offerId} not found`);
      }

      logger.info(`[editOffer] Offer with ID ${offerId} updated successfully`);

      return offer;
    } catch (error) {
      logger.error(
        `[editOffer] Error updating offer: ${(error as Error).message}`,
      );

      throw new InternalServerErrorException(
        `Error updating offer: ${(error as Error).message}`,
      );
    }
  }
}
