import {
  IsEmail,
  IsNumber,
  IsString,
  Length,
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

  @IsString()
  @Length(6, 6)
  pin: string;

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
