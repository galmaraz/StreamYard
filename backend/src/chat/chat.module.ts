import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Participant } from '../participants/participant.entity';
import { Room } from '../rooms/room.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RoomMessage } from './room-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoomMessage, Room, Participant])],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
