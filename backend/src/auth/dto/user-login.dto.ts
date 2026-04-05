import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UserLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string | null;
}
