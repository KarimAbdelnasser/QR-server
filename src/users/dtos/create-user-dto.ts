import {
  IsEmail,
  IsNumber,
  IsString,
  Length,
  Min,
  Max,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(4, 15)
  userName: string;

  @IsEmail()
  email: string;

  @IsString()
  userType: string;

  @IsNumber()
  @Min(100000)
  @Max(999999)
  pin: number;

  @IsNumber()
  @Length(8)
  cardNumber: number;

  @IsBoolean()
  isVerified: boolean;

  @IsBoolean()
  isAdmin: boolean;

  @IsString()
  otpStatus: string;

  @IsNumber()
  @MaxLength(11)
  phoneNumber: string;
}
