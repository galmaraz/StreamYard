import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../shared/types/authenticated-request.type';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomResponse } from './room-response.type';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('invite/:slug')
  findInviteBySlug(@Param('slug') slug: string): Promise<RoomResponse> {
    return this.roomsService.findInviteBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createRoomDto: CreateRoomDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RoomResponse> {
    return this.roomsService.create(createRoomDto, request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() request: AuthenticatedRequest): Promise<RoomResponse[]> {
    return this.roomsService.findAllByHost(request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':slug')
  findBySlug(
    @Param('slug') slug: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<RoomResponse> {
    return this.roomsService.findBySlug(slug, request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/end')
  endRoom(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<RoomResponse> {
    return this.roomsService.endRoom(id, request.user.id);
  }
}
