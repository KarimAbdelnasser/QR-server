import { IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
    @IsString()
    @Length(4, 4, { message: 'OTP must be 4 digits long' })
    @Matches(/^\d{4}$/, { message: 'OTP must be numeric and 4 digits long' })
    otp: string;
}
