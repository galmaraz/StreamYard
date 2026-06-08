import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class JoinRoomEventDto {
  @IsString()
  @MinLength(1)
  slug: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName?: string;
}
