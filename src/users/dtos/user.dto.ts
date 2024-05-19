import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: number;

  @Expose()
  userName: string;

  @Expose()
  userType: string;

  @Expose()
  email: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  cardNumber: number;

  @Expose()
  isVerified: boolean;

  @Expose()
  isAdmin: boolean;
}
