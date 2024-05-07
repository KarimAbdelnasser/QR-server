import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class OfferDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsNumber()
  categoryNumber: number;

  @IsNotEmpty()
  @IsString()
  offerName: string;

  @IsNotEmpty()
  @IsNumber()
  offerPercentage: number;

  @IsNotEmpty()
  @IsString()
  offerDescription: string;
}
