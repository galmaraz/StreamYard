import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ParticipantStateEventDto {
  @IsString()
  @MinLength(1)
  participantId: string;

  @IsOptional()
  @IsBoolean()
  micEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  cameraEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  handRaised?: boolean;
}
