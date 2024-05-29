import { IsString, Matches, Length, IsOptional } from 'class-validator';

export class OtpAndPinDto {
    @IsOptional()
    @IsString()
    @Length(4, 4, { message: 'OTP must be 4 digits long' })
    @Matches(/^\d{4}$/, { message: 'OTP must be numeric and 4 digits long' })
    otp?: string;

    @IsOptional()
    @IsString()
    @Length(6, 6, { message: 'PIN must be 6 digits long' })
    @Matches(/^\d{6}$/, { message: 'PIN must be numeric and 6 digits long' })
    pin?: string;

    @IsOptional()
    @IsString()
    @Length(6, 6, { message: 'New PIN must be 6 digits long' })
    @Matches(/^\d{6}$/, { message: 'New PIN must be numeric and 6 digits long' })
    newPin?: string;
}
