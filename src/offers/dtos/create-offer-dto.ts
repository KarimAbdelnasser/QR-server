import {
  IsNotEmpty,
  IsString,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateOfferDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(15)
  category: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(100)
  categoryNumber: number;

  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  offerName: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(100)
  offerPercentage: number;

  @IsNotEmpty()
  @IsString()
  @MinLength(20)
  @MaxLength(100)
  offerDescription: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^(\d{4})-(\d{2})-(\d{2})$/, {
    message: 'Invalid date format. Date should be in yyyy-mm-dd format.',
  })
  expiresAt: string;
}
