import { IsObject, IsString, MinLength } from 'class-validator';

export class SignalingEventDto {
  @IsString()
  @MinLength(1)
  slug: string;

  @IsString()
  @MinLength(1)
  targetSocketId: string;

  @IsObject()
  payload: Record<string, unknown>;
}
