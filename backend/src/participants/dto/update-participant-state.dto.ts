import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateParticipantStateDto {
  @IsOptional()
  @IsBoolean()
  micEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  cameraEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  handRaised?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  socketId?: string | null;
}
