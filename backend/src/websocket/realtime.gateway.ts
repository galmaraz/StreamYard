import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { ChatService } from '../chat/chat.service';
import { RoomMessageResponse } from '../chat/room-message-response.type';
import { ParticipantsService } from '../participants/participants.service';
import { ParticipantResponse } from '../participants/participant-response.type';
import { ChatMessageEventDto } from './dto/chat-message-event.dto';
import { JoinRoomEventDto } from './dto/join-room-event.dto';
import { KickParticipantEventDto } from './dto/kick-participant-event.dto';
import { LeaveRoomEventDto } from './dto/leave-room-event.dto';
import { ModerateParticipantEventDto } from './dto/moderate-participant-event.dto';
import { ParticipantStateEventDto } from './dto/participant-state-event.dto';
import { RoomSceneEventDto } from './dto/room-scene-event.dto';
import { SignalingEventDto } from './dto/signaling-event.dto';
import {
  DEFAULT_ROOM_SCENE_STATE,
  RoomSceneState,
} from './room-scene-state.type';
import { isAllowedCorsOrigin } from '../shared/config/cors-origin';

type SocketUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

type AuthenticatedSocket = Socket & {
  data: Socket['data'] & {
    user?: SocketUser;
    roomSlug?: string;
    participantId?: string;
  };
};

type JwtPayload = {
  sub: string;
  email: string;
  displayName?: string;
  role: string;
};

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly sceneStates = new Map<string, RoomSceneState>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly participantsService: ParticipantsService,
    private readonly chatService: ChatService,
  ) {}

  handleConnection(client: AuthenticatedSocket): void {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.user = {
        id: payload.sub,
        email: payload.email,
        displayName: payload.displayName ?? 'Invitado',
        role: payload.role,
      };
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const participant = await this.participantsService.leaveBySocketId(client.id);

    if (!participant || !client.data.roomSlug) {
      return;
    }

    if (participant.participantRole === 'spectator') {
      await this.emitSpectatorCount(client.data.roomSlug);
      return;
    }

    client.to(this.roomName(client.data.roomSlug)).emit('participant-disconnected', {
      participant,
    });
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: JoinRoomEventDto,
  ): Promise<{
    participant: ParticipantResponse;
    sceneState: RoomSceneState;
    spectatorCount: number;
  }> {
    const user = this.requireUser(client);
    const participant = await this.participantsService.joinRoom(body.slug, user.id, {
      displayName: body.displayName,
      socketId: client.id,
      accessCode: body.accessCode,
      participantRole: body.participantRole,
    });

    client.data.roomSlug = body.slug;
    client.data.participantId = participant.id;
    await client.join(this.roomName(body.slug));

    if (participant.participantRole === 'spectator') {
      await this.emitSpectatorCount(body.slug);
    } else {
      client.to(this.roomName(body.slug)).emit('participant-connected', {
        participant,
      });
    }

    return {
      participant,
      sceneState: this.getSceneState(body.slug),
      spectatorCount: await this.participantsService.countActiveSpectators(
        body.slug,
      ),
    };
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: LeaveRoomEventDto,
  ): Promise<{ participant: ParticipantResponse }> {
    const user = this.requireUser(client);
    const participant = await this.participantsService.leaveRoom(
      body.participantId,
      user.id,
    );
    const slug = client.data.roomSlug;

    if (slug) {
      await client.leave(this.roomName(slug));

      if (participant.participantRole === 'spectator') {
        await this.emitSpectatorCount(slug);
      } else {
        client.to(this.roomName(slug)).emit('participant-disconnected', {
          participant,
        });
      }
    }

    client.data.roomSlug = undefined;
    client.data.participantId = undefined;

    return { participant };
  }

  @SubscribeMessage('toggle-mic')
  handleToggleMic(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ParticipantStateEventDto,
  ): Promise<{ participant: ParticipantResponse }> {
    return this.updateParticipantState(client, body);
  }

  @SubscribeMessage('toggle-camera')
  handleToggleCamera(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ParticipantStateEventDto,
  ): Promise<{ participant: ParticipantResponse }> {
    return this.updateParticipantState(client, body);
  }

  @SubscribeMessage('raise-hand')
  handleRaiseHand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ParticipantStateEventDto,
  ): Promise<{ participant: ParticipantResponse }> {
    return this.updateParticipantState(client, body);
  }

  @SubscribeMessage('moderate-participant')
  async handleModerateParticipant(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ModerateParticipantEventDto,
  ): Promise<{ participant: ParticipantResponse }> {
    const user = this.requireUser(client);
    const participant = await this.participantsService.moderateParticipant(
      body.participantId,
      user.id,
      {
        micEnabled: body.micEnabled,
        cameraEnabled: body.cameraEnabled,
        handRaised: body.handRaised,
      },
    );

    this.emitParticipantUpdated(client, participant);

    return { participant };
  }

  @SubscribeMessage('kick-participant')
  async handleKickParticipant(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: KickParticipantEventDto,
  ): Promise<{ participant: ParticipantResponse }> {
    const user = this.requireUser(client);
    const activeParticipant = await this.participantsService.findActiveById(
      body.participantId,
    );
    const participant = await this.participantsService.kickParticipant(
      body.participantId,
      user.id,
    );
    const slug = client.data.roomSlug;

    if (slug) {
      this.server.to(this.roomName(slug)).emit('participant-disconnected', {
        participant,
      });
    }

    if (activeParticipant?.socketId) {
      this.server.to(activeParticipant.socketId).emit('participant-kicked', {
        participant,
      });
    }

    return { participant };
  }

  @SubscribeMessage('chat-message')
  async handleChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ChatMessageEventDto,
  ): Promise<{ message: RoomMessageResponse }> {
    const user = this.requireUser(client);
    const slug = this.requireRoomSlug(client);
    const message = await this.chatService.createMessage(slug, user.id, {
      content: body.content,
    });

    this.server.to(this.roomName(slug)).emit('chat-message', {
      message,
    });

    return { message };
  }

  @SubscribeMessage('room-scene-update')
  async handleRoomSceneUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: RoomSceneEventDto,
  ): Promise<{ sceneState: RoomSceneState }> {
    const user = this.requireUser(client);
    const slug = this.requireRoomSlug(client);

    await this.participantsService.assertRoomHost(slug, user.id);

    const sceneState = this.updateSceneState(slug, body);

    this.server.to(this.roomName(slug)).emit('room-scene-updated', {
      sceneState,
    });

    return { sceneState };
  }

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: SignalingEventDto,
  ): void {
    this.forwardSignalingEvent(client, body, 'offer');
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: SignalingEventDto,
  ): void {
    this.forwardSignalingEvent(client, body, 'answer');
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: SignalingEventDto,
  ): void {
    this.forwardSignalingEvent(client, body, 'ice-candidate');
  }

  private async updateParticipantState(
    client: AuthenticatedSocket,
    body: ParticipantStateEventDto,
  ): Promise<{ participant: ParticipantResponse }> {
    const user = this.requireUser(client);
    const participant = await this.participantsService.updateState(
      body.participantId,
      user.id,
      {
        micEnabled: body.micEnabled,
        cameraEnabled: body.cameraEnabled,
        handRaised: body.handRaised,
      },
    );
    const slug = client.data.roomSlug;

    if (slug) {
      this.emitParticipantUpdated(client, participant);
    }

    return { participant };
  }

  private forwardSignalingEvent(
    client: AuthenticatedSocket,
    body: SignalingEventDto,
    eventName: 'offer' | 'answer' | 'ice-candidate',
  ): void {
    const user = this.requireUser(client);

    if (client.data.roomSlug !== body.slug) {
      this.logger.warn(
        `Socket ${client.id} tried ${eventName} outside joined room ${body.slug}`,
      );
      return;
    }

    this.server.to(body.targetSocketId).emit(eventName, {
      fromSocketId: client.id,
      fromUserId: user.id,
      payload: body.payload,
    });
  }

  private requireUser(client: AuthenticatedSocket): SocketUser {
    if (!client.data.user) {
      client.disconnect(true);
      throw new Error('Unauthenticated socket');
    }

    return client.data.user;
  }

  private requireRoomSlug(client: AuthenticatedSocket): string {
    if (!client.data.roomSlug) {
      throw new Error('Socket is not joined to a room');
    }

    return client.data.roomSlug;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string') {
      return authToken;
    }

    const header = client.handshake.headers.authorization;

    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return null;
  }

  private roomName(slug: string): string {
    return `room:${slug}`;
  }

  private getSceneState(slug: string): RoomSceneState {
    const sceneState = this.sceneStates.get(slug);

    if (sceneState) {
      return sceneState;
    }

    const defaultState = { ...DEFAULT_ROOM_SCENE_STATE };
    this.sceneStates.set(slug, defaultState);

    return defaultState;
  }

  private updateSceneState(
    slug: string,
    updates: RoomSceneEventDto,
  ): RoomSceneState {
    const sceneState: RoomSceneState = {
      ...this.getSceneState(slug),
      ...updates,
    };

    this.sceneStates.set(slug, sceneState);

    return sceneState;
  }

  private emitParticipantUpdated(
    client: AuthenticatedSocket,
    participant: ParticipantResponse,
  ): void {
    const slug = client.data.roomSlug;

    if (!slug) {
      return;
    }

    this.server.to(this.roomName(slug)).emit('participant-updated', {
      participant,
    });
  }

  private async emitSpectatorCount(slug: string): Promise<void> {
    this.server.to(this.roomName(slug)).emit('spectator-count-updated', {
      spectatorCount: await this.participantsService.countActiveSpectators(slug),
    });
  }
}
