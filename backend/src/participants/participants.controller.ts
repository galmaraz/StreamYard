import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../shared/types/authenticated-request.type';
import { JoinRoomDto } from './dto/join-room.dto';
import { ModerateParticipantDto } from './dto/moderate-participant.dto';
import { UpdateParticipantStateDto } from './dto/update-participant-state.dto';
import { ParticipantResponse } from './participant-response.type';
import { ParticipantsService } from './participants.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post('rooms/:slug/participants/join')
  joinRoom(
    @Param('slug') slug: string,
    @Body() joinRoomDto: JoinRoomDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ParticipantResponse> {
    return this.participantsService.joinRoom(
      slug,
      request.user.id,
      joinRoomDto,
    );
  }

  @Get('rooms/:slug/participants')
  findActiveByRoom(
    @Param('slug') slug: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ParticipantResponse[]> {
    return this.participantsService.findActiveByRoom(slug, request.user.id);
  }

  @Patch('participants/:id/state')
  updateState(
    @Param('id') id: string,
    @Body() updateDto: UpdateParticipantStateDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ParticipantResponse> {
    return this.participantsService.updateState(id, request.user.id, updateDto);
  }

  @Post('participants/:id/leave')
  leaveRoom(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ParticipantResponse> {
    return this.participantsService.leaveRoom(id, request.user.id);
  }

  @Patch('participants/:id/moderation')
  moderateParticipant(
    @Param('id') id: string,
    @Body() moderationDto: ModerateParticipantDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ParticipantResponse> {
    return this.participantsService.moderateParticipant(
      id,
      request.user.id,
      moderationDto,
    );
  }

  @Post('participants/:id/kick')
  kickParticipant(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ParticipantResponse> {
    return this.participantsService.kickParticipant(id, request.user.id);
  }
}
