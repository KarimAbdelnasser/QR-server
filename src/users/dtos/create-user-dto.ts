import { IsEmail, IsNumber, IsString, Length, Min, Max } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(4, 15)
  userName: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(1000)
  @Max(9999)
  pin: number;
}
