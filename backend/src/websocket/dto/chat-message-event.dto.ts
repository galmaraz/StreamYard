import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChatMessageEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}
