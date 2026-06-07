import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../shared/types/authenticated-request.type';
import { ChatService } from './chat.service';
import { RoomMessageResponse } from './room-message-response.type';

@UseGuards(JwtAuthGuard)
@Controller('rooms/:slug/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  findRecentByRoom(
    @Param('slug') slug: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<RoomMessageResponse[]> {
    return this.chatService.findRecentByRoom(slug, request.user.id);
  }
}
