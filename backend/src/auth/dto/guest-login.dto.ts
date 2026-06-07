import { IsString, MaxLength, MinLength } from 'class-validator';

export class GuestLoginDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName: string;
}
