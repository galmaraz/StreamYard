import { IsBoolean, IsOptional } from 'class-validator';

export class ModerateParticipantDto {
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
