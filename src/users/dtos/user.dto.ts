import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: number;

  @Expose()
  userName: string;

  @Expose()
  email: string;

  @Expose()
  cardNumber: number;

  @Expose()
  pin: string;

  @Expose()
  isVerified: boolean;

  @Expose()
  isAdmin: boolean;
}
