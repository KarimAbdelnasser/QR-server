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
      return await newOffer.save();
    } catch (error) {
      logger.error(`Error adding offer: ${(error as Error).message}`);
      throw new InternalServerErrorException(
        `Could not add offer: ${(error as Error).message}`,
      );
    }
  }

  async addOffers(userId: string, offers: Offer[]): Promise<Offer[]> {
    try {
      offers.forEach((offer) => (offer.userId = userId));
      const createdOffers = await this.offerModel.insertMany(offers);
      return createdOffers;
    } catch (error) {
      logger.error(`Error adding offers: ${(error as Error).message}`);
      throw new InternalServerErrorException(
        `Could not add offers: ${(error as Error).message}`,
      );
    }
  }

  async getAllCategories(): Promise<string[]> {
    try {
      const categories = await this.offerModel.distinct('category').exec();
      return categories;
    } catch (error) {
      throw new InternalServerErrorException(
        `Error fetching categories: ${(error as Error).message}`,
      );
    }
  }

  async getOffers(limit: number): Promise<Offer[]> {
    try {
      const offers = await this.offerModel.find().limit(limit).exec();

      if (offers.length === 0) {
        throw new NotFoundException('There are no offers available.');
      }

      return offers;
    } catch (error) {
      logger.error(`Error fetching offers: ${(error as Error).message}`);
      throw new NotFoundException(
        `Offers not found: ${(error as Error).message}`,
      );
    }
  }

  async getOffersByCategory(category: string, limit: number): Promise<Offer[]> {
    console.log(limit);
    try {
      const offers = await this.offerModel
        .find({ category })
        .limit(limit)
        .exec();

      if (offers.length === 0) {
        throw new NotFoundException(
          `There are no offers available for category '${category}'.`,
        );
      }

      return offers;
    } catch (error) {
      logger.error(
        `Error fetching offers by category: ${(error as Error).message}`,
      );
      throw new NotFoundException(
        `Offers not found for this category: ${(error as Error).message}`,
      );
    }
  }

  async getOffersByBrand(brand: string, limit: number): Promise<Offer[]> {
    try {
      const offers = await this.offerModel
        .find({ offerName: brand })
        .limit(limit)
        .exec();

      if (offers.length === 0) {
        throw new NotFoundException(
          `There are no offers available for this brand '${brand}'.`,
        );
      }

      return offers;
    } catch (error) {
      logger.error(
        `Error fetching offers by brand: ${(error as Error).message}`,
      );
      throw new NotFoundException(
        `Offers not found for this brand: ${(error as Error).message}`,
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

      return offer;
    } catch (error) {
      throw new InternalServerErrorException(
        `Error updating offer: ${(error as Error).message}`,
      );
    }
  }
}
