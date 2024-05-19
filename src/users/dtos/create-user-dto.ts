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
  @Min(1000)
  @Max(9999)
  pin: number;

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
