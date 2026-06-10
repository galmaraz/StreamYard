import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Participant } from '../participants/participant.entity';
import { RoomStatus } from '../rooms/room-status.enum';
import { Room } from '../rooms/room.entity';
import { CreateRoomMessageDto } from './dto/create-room-message.dto';
import {
  RoomMessageResponse,
  toRoomMessageResponse,
} from './room-message-response.type';
import { RoomMessage } from './room-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(RoomMessage)
    private readonly messagesRepository: Repository<RoomMessage>,
    @InjectRepository(Room)
    private readonly roomsRepository: Repository<Room>,
    @InjectRepository(Participant)
    private readonly participantsRepository: Repository<Participant>,
  ) {}

  async findRecentByRoom(
    slug: string,
    userId: string,
  ): Promise<RoomMessageResponse[]> {
    const room = await this.findAccessibleRoom(slug, userId);
    const messages = await this.messagesRepository.find({
      where: { roomId: room.id },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return messages.reverse().map(toRoomMessageResponse);
  }

  async createMessage(
    slug: string,
    userId: string,
    createMessageDto: CreateRoomMessageDto,
  ): Promise<RoomMessageResponse> {
    const room = await this.findJoinableRoom(slug);
    const participant = await this.findActiveParticipant(room.id, userId);
    const content = createMessageDto.content.trim();

    if (!content) {
      throw new ForbiddenException('Message content is empty');
    }

    const message = this.messagesRepository.create({
      roomId: room.id,
      participantId: participant.id,
      userId,
      displayName: participant.displayName,
      content,
    });

    return toRoomMessageResponse(await this.messagesRepository.save(message));
  }

  private async findAccessibleRoom(slug: string, userId: string): Promise<Room> {
    const room = await this.findJoinableRoom(slug);

    if (room.hostId === userId) {
      return room;
    }

    await this.findActiveParticipant(room.id, userId);

    return room;
  }

  private async findJoinableRoom(slug: string): Promise<Room> {
    const room = await this.roomsRepository.findOne({ where: { slug } });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.status !== RoomStatus.Active) {
      throw new ForbiddenException('Room is not active');
    }

    return room;
  }

  private async findActiveParticipant(
    roomId: string,
    userId: string,
  ): Promise<Participant> {
    const participant = await this.participantsRepository.findOne({
      where: {
        roomId,
        userId,
        leftAt: IsNull(),
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not connected to this room');
    }

    return participant;
  }
}
