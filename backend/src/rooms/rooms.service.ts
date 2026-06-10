import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UsersService } from '../users/users.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomResponse, toRoomResponse } from './room-response.type';
import { RoomStatus } from './room-status.enum';
import { Room } from './room.entity';
import { slugify } from './slug.util';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomsRepository: Repository<Room>,
    private readonly usersService: UsersService,
  ) {}

  async create(createRoomDto: CreateRoomDto, hostId: string): Promise<RoomResponse> {
    const host = await this.usersService.findById(hostId);

    if (!host) {
      throw new NotFoundException('Host not found');
    }

    const room = this.roomsRepository.create({
      title: createRoomDto.title,
      slug: await this.createUniqueSlug(createRoomDto.title),
      isPrivate: createRoomDto.isPrivate ?? false,
      accessCode: this.createAccessCode(),
      hostId: host.id,
      status: RoomStatus.Active,
    });

    return toRoomResponse(await this.roomsRepository.save(room), {
      includeAccessCode: true,
    });
  }

  async findAllByHost(hostId: string): Promise<RoomResponse[]> {
    const rooms = await this.roomsRepository.find({
      where: { hostId },
      order: { createdAt: 'DESC' },
    });

    return rooms.map((room) => toRoomResponse(room, { includeAccessCode: true }));
  }

  async findBySlug(slug: string, hostId: string): Promise<RoomResponse> {
    const room = await this.roomsRepository.findOne({
      where: { slug, hostId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return toRoomResponse(room, { includeAccessCode: true });
  }

  async findInviteBySlug(slug: string): Promise<RoomResponse> {
    const room = await this.roomsRepository.findOne({
      where: { slug },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.status !== RoomStatus.Active) {
      throw new ForbiddenException('Room is not active');
    }

    return toRoomResponse(room);
  }

  async endRoom(id: string, hostId: string): Promise<RoomResponse> {
    const room = await this.roomsRepository.findOne({
      where: { id, hostId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.status !== RoomStatus.Ended) {
      room.status = RoomStatus.Ended;
      room.endedAt = new Date();
    }

    return toRoomResponse(await this.roomsRepository.save(room), {
      includeAccessCode: true,
    });
  }

  private createAccessCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private async createUniqueSlug(title: string): Promise<string> {
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let suffix = 1;

    while (await this.roomsRepository.exists({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return slug;
  }
}
