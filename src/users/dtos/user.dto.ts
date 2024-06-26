import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: number;

  @Expose()
  userName: string;

  @Expose()
  userType: string;

  @Expose()
  pin: string;

  @Expose()
  email: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  cardNumber: string;

  @Expose()
  isVerified: boolean;

  @Expose()
  isAdmin: boolean;
}
