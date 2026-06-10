import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const participantRoles = ['participant', 'spectator'];

export class JoinRoomEventDto {
  @IsString()
  @MinLength(1)
  slug: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  accessCode?: string;

  @IsOptional()
  @IsIn(participantRoles)
  participantRole?: 'participant' | 'spectator';
}
