import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { API_BASE_URL } from '../core/api.config';
import { AuthTokenService } from '../core/auth-token.service';
import { Participant, RoomMessage, RoomSceneState } from '../core/models';

type JoinRoomResponse = {
  participant: Participant;
  sceneState: RoomSceneState;
  spectatorCount: number;
};

type ChatMessageResponse = {
  message: RoomMessage;
};

type RoomSceneResponse = {
  sceneState: RoomSceneState;
};

export type SignalingMessage = {
  fromSocketId: string;
  fromUserId: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
};

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: Socket | null = null;
  private roomSlug: string | null = null;
  private readonly offerSubject = new Subject<SignalingMessage>();
  private readonly answerSubject = new Subject<SignalingMessage>();
  private readonly iceCandidateSubject = new Subject<SignalingMessage>();

  readonly connected = signal(false);
  readonly participant = signal<Participant | null>(null);
  readonly participants = signal<Participant[]>([]);
  readonly messages = signal<RoomMessage[]>([]);
  readonly roomSceneState = signal<RoomSceneState | null>(null);
  readonly spectatorCount = signal(0);
  readonly kicked = signal(false);
  readonly lastSignal = signal<string | null>(null);
  readonly offers$ = this.offerSubject.asObservable();
  readonly answers$ = this.answerSubject.asObservable();
  readonly iceCandidates$ = this.iceCandidateSubject.asObservable();

  constructor(private readonly authTokenService: AuthTokenService) {}

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = this.authTokenService.getToken();

    if (!token) {
      throw new Error('Missing access token');
    }

    this.socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('participant-connected', ({ participant }) => {
      this.upsertParticipant(participant);
    });
    this.socket.on('participant-disconnected', ({ participant }) => {
      this.removeParticipant(participant.id);
    });
    this.socket.on('participant-updated', ({ participant }) => {
      if (this.participant()?.id === participant.id) {
        this.participant.set(participant);
      }

      this.upsertParticipant(participant);
    });
    this.socket.on('participant-kicked', ({ participant }) => {
      this.kicked.set(true);
      this.removeParticipant(participant.id);
      this.participant.set(null);
      this.socket?.disconnect();
      this.socket = null;
    });
    this.socket.on('chat-message', ({ message }) => {
      this.upsertMessage(message);
    });
    this.socket.on('room-scene-updated', ({ sceneState }) => {
      this.roomSceneState.set(sceneState);
    });
    this.socket.on('spectator-count-updated', ({ spectatorCount }) => {
      this.spectatorCount.set(spectatorCount);
    });
    this.socket.on('offer', (message: SignalingMessage) => {
      this.lastSignal.set('offer recibido');
      this.offerSubject.next(message);
    });
    this.socket.on('answer', (message: SignalingMessage) => {
      this.lastSignal.set('answer recibido');
      this.answerSubject.next(message);
    });
    this.socket.on('ice-candidate', (message: SignalingMessage) => {
      this.lastSignal.set('ice-candidate recibido');
      this.iceCandidateSubject.next(message);
    });
  }

  joinRoom(
    slug: string,
    displayName?: string,
    accessCode?: string,
    participantRole: Participant['participantRole'] = 'participant',
  ): Promise<Participant> {
    this.connect();

    return new Promise((resolve, reject) => {
      this.socket?.timeout(5000).emit(
        'join-room',
        { slug, displayName, accessCode, participantRole },
        (
          error: Error | null,
          response?: JoinRoomResponse,
        ) => {
          if (error || !response) {
            reject(error ?? new Error('No join-room response'));
            return;
          }

          this.roomSlug = slug;
          this.participant.set(response.participant);
          this.roomSceneState.set(response.sceneState);
          this.spectatorCount.set(response.spectatorCount);
          this.upsertParticipant(response.participant);
          resolve(response.participant);
        },
      );
    });
  }

  toggleMic(enabled: boolean): Promise<Participant> {
    return this.updateState('toggle-mic', { micEnabled: enabled });
  }

  toggleCamera(enabled: boolean): Promise<Participant> {
    return this.updateState('toggle-camera', { cameraEnabled: enabled });
  }

  raiseHand(enabled: boolean): Promise<Participant> {
    return this.updateState('raise-hand', { handRaised: enabled });
  }

  moderateParticipant(
    participantId: string,
    state: Partial<Pick<Participant, 'micEnabled' | 'cameraEnabled' | 'handRaised'>>,
  ): Promise<Participant> {
    return this.emitParticipantMutation('moderate-participant', {
      participantId,
      ...state,
    });
  }

  kickParticipant(participantId: string): Promise<Participant> {
    return this.emitParticipantMutation('kick-participant', { participantId });
  }

  sendChatMessage(content: string): Promise<RoomMessage> {
    return new Promise((resolve, reject) => {
      this.socket?.timeout(5000).emit(
        'chat-message',
        { content },
        (error: Error | null, response?: ChatMessageResponse) => {
          if (error || !response) {
            reject(error ?? new Error('No chat-message response'));
            return;
          }

          this.upsertMessage(response.message);
          resolve(response.message);
        },
      );
    });
  }

  updateRoomSceneState(
    sceneState: Partial<RoomSceneState>,
  ): Promise<RoomSceneState> {
    return new Promise((resolve, reject) => {
      this.socket?.timeout(5000).emit(
        'room-scene-update',
        sceneState,
        (error: Error | null, response?: RoomSceneResponse) => {
          if (error || !response) {
            reject(error ?? new Error('No room-scene-update response'));
            return;
          }

          this.roomSceneState.set(response.sceneState);
          resolve(response.sceneState);
        },
      );
    });
  }

  leaveRoom(): void {
    const participant = this.participant();

    if (participant) {
      this.socket?.emit('leave-room', { participantId: participant.id });
    }

    this.roomSlug = null;
    this.kicked.set(false);
    this.participant.set(null);
    this.participants.set([]);
    this.messages.set([]);
    this.roomSceneState.set(null);
    this.spectatorCount.set(0);
    this.socket?.disconnect();
    this.socket = null;
  }

  setParticipants(participants: Participant[]): void {
    this.participants.set(participants);
  }

  setMessages(messages: RoomMessage[]): void {
    this.messages.set(messages);
  }

  sendOffer(
    targetSocketId: string,
    payload: RTCSessionDescriptionInit,
  ): void {
    this.emitSignal('offer', targetSocketId, payload);
    this.lastSignal.set('offer enviado');
  }

  sendAnswer(
    targetSocketId: string,
    payload: RTCSessionDescriptionInit,
  ): void {
    this.emitSignal('answer', targetSocketId, payload);
    this.lastSignal.set('answer enviado');
  }

  sendIceCandidate(
    targetSocketId: string,
    payload: RTCIceCandidateInit,
  ): void {
    this.emitSignal('ice-candidate', targetSocketId, payload);
  }

  private updateState(
    eventName: 'toggle-mic' | 'toggle-camera' | 'raise-hand',
    state: Partial<
      Pick<Participant, 'micEnabled' | 'cameraEnabled' | 'handRaised'>
    >,
  ): Promise<Participant> {
    const participant = this.participant();

    if (!participant) {
      return Promise.reject(new Error('Not joined to a room'));
    }

    return this.emitParticipantMutation(eventName, {
      participantId: participant.id,
      ...state,
    });
  }

  private emitParticipantMutation(
    eventName:
      | 'toggle-mic'
      | 'toggle-camera'
      | 'raise-hand'
      | 'moderate-participant'
      | 'kick-participant',
    payload: Record<string, unknown>,
  ): Promise<Participant> {
    return new Promise((resolve, reject) => {
      this.socket?.timeout(5000).emit(
        eventName,
        payload,
        (error: Error | null, response?: JoinRoomResponse) => {
          if (error || !response) {
            reject(error ?? new Error(`No ${eventName} response`));
            return;
          }

          if (this.participant()?.id === response.participant.id) {
            this.participant.set(response.participant);
          }

          this.upsertParticipant(response.participant);
          resolve(response.participant);
        },
      );
    });
  }

  private upsertParticipant(participant: Participant): void {
    const participants = this.participants();
    const existingIndex = participants.findIndex(({ id }) => id === participant.id);

    if (existingIndex === -1) {
      this.participants.set([...participants, participant]);
      return;
    }

    this.participants.set(
      participants.map((current) =>
        current.id === participant.id ? participant : current,
      ),
    );
  }

  private removeParticipant(participantId: string): void {
    this.participants.set(
      this.participants().filter(({ id }) => id !== participantId),
    );
  }

  private upsertMessage(message: RoomMessage): void {
    const messages = this.messages();

    if (messages.some(({ id }) => id === message.id)) {
      return;
    }

    this.messages.set([...messages, message].slice(-50));
  }

  private emitSignal(
    eventName: 'offer' | 'answer' | 'ice-candidate',
    targetSocketId: string,
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ): void {
    if (!this.roomSlug) {
      return;
    }

    this.socket?.emit(eventName, {
      slug: this.roomSlug,
      targetSocketId,
      payload,
    });
  }
}
