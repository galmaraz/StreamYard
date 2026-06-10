import { IsString, MinLength } from 'class-validator';

export class LeaveRoomEventDto {
  @IsString()
  @MinLength(1)
  participantId: string;
}
