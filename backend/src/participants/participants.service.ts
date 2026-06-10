import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

import { RoomStatus } from '../rooms/room-status.enum';
import { Room } from '../rooms/room.entity';
import { UsersService } from '../users/users.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { UpdateParticipantStateDto } from './dto/update-participant-state.dto';
import {
  ParticipantResponse,
  toParticipantResponse,
} from './participant-response.type';
import { Participant } from './participant.entity';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantsRepository: Repository<Participant>,
    @InjectRepository(Room)
    private readonly roomsRepository: Repository<Room>,
    private readonly usersService: UsersService,
  ) {}

  async joinRoom(
    slug: string,
    userId: string,
    joinRoomDto: JoinRoomDto,
  ): Promise<ParticipantResponse> {
    const room = await this.findJoinableRoom(slug);
    const user = await this.usersService.findById(userId);
    const isHost = room.hostId === userId;
    const displayName =
      joinRoomDto.displayName?.trim() ?? user?.displayName ?? 'Invitado';

    if (!isHost && !this.isValidAccessCode(room, joinRoomDto.accessCode)) {
      throw new ForbiddenException('Invalid room access code');
    }

    const existingActiveParticipant =
      await this.participantsRepository.findOne({
        where: {
          roomId: room.id,
          userId,
          leftAt: IsNull(),
        },
      });

    if (existingActiveParticipant) {
      existingActiveParticipant.displayName = displayName;
      existingActiveParticipant.participantRole =
        joinRoomDto.participantRole ?? existingActiveParticipant.participantRole;
      existingActiveParticipant.socketId =
        joinRoomDto.socketId ?? existingActiveParticipant.socketId;
      existingActiveParticipant.micEnabled =
        existingActiveParticipant.participantRole === 'spectator'
          ? false
          : existingActiveParticipant.micEnabled;
      existingActiveParticipant.cameraEnabled =
        existingActiveParticipant.participantRole === 'spectator'
          ? false
          : existingActiveParticipant.cameraEnabled;

      return toParticipantResponse(
        await this.participantsRepository.save(existingActiveParticipant),
      );
    }

    const participantRole = joinRoomDto.participantRole ?? 'participant';

    const participant = this.participantsRepository.create({
      roomId: room.id,
      userId,
      displayName,
      participantRole,
      socketId: joinRoomDto.socketId ?? null,
      micEnabled: participantRole !== 'spectator',
      cameraEnabled: participantRole !== 'spectator',
      handRaised: false,
    });

    return toParticipantResponse(
      await this.participantsRepository.save(participant),
    );
  }

  async findActiveByRoom(
    slug: string,
    userId: string,
  ): Promise<ParticipantResponse[]> {
    const room = await this.findAccessibleRoom(slug, userId);
    const participants = await this.participantsRepository.find({
      where: {
        roomId: room.id,
        leftAt: IsNull(),
        participantRole: Not('spectator'),
      },
      order: { joinedAt: 'ASC' },
    });

    return participants.map(toParticipantResponse);
  }

  async countActiveSpectators(slug: string): Promise<number> {
    const room = await this.findJoinableRoom(slug);

    return this.participantsRepository.count({
      where: {
        roomId: room.id,
        participantRole: 'spectator',
        leftAt: IsNull(),
      },
    });
  }

  async updateState(
    id: string,
    userId: string,
    updateDto: UpdateParticipantStateDto,
  ): Promise<ParticipantResponse> {
    const participant = await this.findActiveParticipant(id, userId);

    if (updateDto.micEnabled !== undefined) {
      participant.micEnabled = updateDto.micEnabled;
    }

    if (updateDto.cameraEnabled !== undefined) {
      participant.cameraEnabled = updateDto.cameraEnabled;
    }

    if (updateDto.handRaised !== undefined) {
      participant.handRaised = updateDto.handRaised;
    }

    if (updateDto.socketId !== undefined) {
      participant.socketId = updateDto.socketId;
    }

    return toParticipantResponse(
      await this.participantsRepository.save(participant),
    );
  }

  async leaveRoom(id: string, userId: string): Promise<ParticipantResponse> {
    const participant = await this.findActiveParticipant(id, userId);
    participant.leftAt = new Date();
    participant.socketId = null;
    participant.handRaised = false;

    return toParticipantResponse(
      await this.participantsRepository.save(participant),
    );
  }

  async leaveBySocketId(socketId: string): Promise<ParticipantResponse | null> {
    const participant = await this.participantsRepository.findOne({
      where: {
        socketId,
        leftAt: IsNull(),
      },
    });

    if (!participant) {
      return null;
    }

    participant.leftAt = new Date();
    participant.socketId = null;
    participant.handRaised = false;

    return toParticipantResponse(
      await this.participantsRepository.save(participant),
    );
  }

  async findActiveById(id: string): Promise<ParticipantResponse> {
    const participant = await this.participantsRepository.findOne({
      where: {
        id,
        leftAt: IsNull(),
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return toParticipantResponse(participant);
  }

  async moderateParticipant(
    participantId: string,
    hostId: string,
    updateDto: UpdateParticipantStateDto,
  ): Promise<ParticipantResponse> {
    const participant = await this.findParticipantForHost(
      participantId,
      hostId,
    );

    if (updateDto.micEnabled !== undefined) {
      participant.micEnabled = updateDto.micEnabled;
    }

    if (updateDto.cameraEnabled !== undefined) {
      participant.cameraEnabled = updateDto.cameraEnabled;
    }

    if (updateDto.handRaised !== undefined) {
      participant.handRaised = updateDto.handRaised;
    }

    return toParticipantResponse(
      await this.participantsRepository.save(participant),
    );
  }

  async kickParticipant(
    participantId: string,
    hostId: string,
  ): Promise<ParticipantResponse> {
    const participant = await this.findParticipantForHost(
      participantId,
      hostId,
    );

    participant.leftAt = new Date();
    participant.socketId = null;
    participant.handRaised = false;

    return toParticipantResponse(
      await this.participantsRepository.save(participant),
    );
  }

  async assertRoomHost(slug: string, hostId: string): Promise<void> {
    const room = await this.findJoinableRoom(slug);

    if (room.hostId !== hostId) {
      throw new ForbiddenException('Only the host can update this room');
    }
  }

  private isValidAccessCode(room: Room, accessCode?: string): boolean {
    return room.accessCode.toUpperCase() === accessCode?.trim().toUpperCase();
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

  private async findAccessibleRoom(slug: string, userId: string): Promise<Room> {
    const room = await this.findJoinableRoom(slug);
    const participant = await this.participantsRepository.findOne({
      where: {
        roomId: room.id,
        userId,
        leftAt: IsNull(),
      },
    });

    if (!participant && room.hostId !== userId) {
      throw new ForbiddenException('You are not connected to this room');
    }

    return room;
  }

  private async findActiveParticipant(
    id: string,
    userId: string,
  ): Promise<Participant> {
    const participant = await this.participantsRepository.findOne({
      where: {
        id,
        userId,
        leftAt: IsNull(),
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return participant;
  }

  private async findParticipantForHost(
    participantId: string,
    hostId: string,
  ): Promise<Participant> {
    const participant = await this.participantsRepository.findOne({
      relations: { room: true },
      where: {
        id: participantId,
        leftAt: IsNull(),
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.room.hostId !== hostId) {
      throw new ForbiddenException('Only the host can moderate this participant');
    }

    return participant;
  }
}
