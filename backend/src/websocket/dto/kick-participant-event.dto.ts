import { IsString, MinLength } from 'class-validator';

export class KickParticipantEventDto {
  @IsString()
  @MinLength(1)
  participantId: string;
}
