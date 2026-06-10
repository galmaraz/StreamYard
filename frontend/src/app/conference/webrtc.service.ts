import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { Participant } from '../core/models';
import { RealtimeService, SignalingMessage } from './realtime.service';

export type RemoteStream = {
  socketId: string;
  stream: MediaStream;
};

@Injectable({ providedIn: 'root' })
export class WebrtcService implements OnDestroy {
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly subscriptions = new Subscription();
  private localStream: MediaStream | null = null;
  private roomSlug: string | null = null;
  readonly remoteStreams = signal<RemoteStream[]>([]);

  constructor(private readonly realtimeService: RealtimeService) {
    this.subscriptions.add(
      this.realtimeService.offers$.subscribe((message) =>
        void this.handleOffer(message),
      ),
    );
    this.subscriptions.add(
      this.realtimeService.answers$.subscribe((message) =>
        void this.handleAnswer(message),
      ),
    );
    this.subscriptions.add(
      this.realtimeService.iceCandidates$.subscribe((message) =>
        void this.handleIceCandidate(message),
      ),
    );
  }

  ngOnDestroy(): void {
    this.dispose();
    this.subscriptions.unsubscribe();
  }

  initialize(roomSlug: string, localStream: MediaStream | null = null): void {
    this.roomSlug = roomSlug;
    this.localStream = localStream;
  }

  async updateLocalStream(localStream: MediaStream | null): Promise<void> {
    this.localStream = localStream;

    await Promise.all(
      Array.from(this.peers.values()).map((peer) =>
        this.replacePeerTracks(peer, localStream),
      ),
    );
  }

  async connectToExistingParticipants(
    participants: Participant[],
    currentParticipant: Participant,
  ): Promise<void> {
    const remoteParticipants = participants.filter(
      (participant) =>
        participant.id !== currentParticipant.id && Boolean(participant.socketId),
    );

    await Promise.all(
      remoteParticipants.map((participant) =>
        this.createOffer(participant.socketId as string),
      ),
    );
  }

  dispose(): void {
    this.peers.forEach((peer) => peer.close());
    this.peers.clear();
    this.remoteStreams.set([]);
    this.localStream = null;
    this.roomSlug = null;
  }

  private async createOffer(targetSocketId: string): Promise<void> {
    const peer = this.getOrCreatePeer(targetSocketId);
    const offer = await peer.createOffer();

    await peer.setLocalDescription(offer);
    this.realtimeService.sendOffer(targetSocketId, offer);
  }

  private async handleOffer(message: SignalingMessage): Promise<void> {
    const peer = this.getOrCreatePeer(message.fromSocketId);

    await peer.setRemoteDescription(
      new RTCSessionDescription(message.payload as RTCSessionDescriptionInit),
    );

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    this.realtimeService.sendAnswer(message.fromSocketId, answer);
  }

  private async handleAnswer(message: SignalingMessage): Promise<void> {
    const peer = this.peers.get(message.fromSocketId);

    if (!peer) {
      return;
    }

    await peer.setRemoteDescription(
      new RTCSessionDescription(message.payload as RTCSessionDescriptionInit),
    );
  }

  private async handleIceCandidate(message: SignalingMessage): Promise<void> {
    const peer = this.peers.get(message.fromSocketId);

    if (!peer || !message.payload) {
      return;
    }

    await peer.addIceCandidate(
      new RTCIceCandidate(message.payload as RTCIceCandidateInit),
    );
  }

  private getOrCreatePeer(targetSocketId: string): RTCPeerConnection {
    const existingPeer = this.peers.get(targetSocketId);

    if (existingPeer) {
      return existingPeer;
    }

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          peer.addTrack(track, this.localStream);
        }
      });
    } else {
      peer.addTransceiver('audio', { direction: 'recvonly' });
      peer.addTransceiver('video', { direction: 'recvonly' });
    }

    peer.onicecandidate = ({ candidate }) => {
      if (candidate && this.roomSlug) {
        this.realtimeService.sendIceCandidate(
          targetSocketId,
          candidate.toJSON(),
        );
      }
    };

    peer.ontrack = ({ streams }) => {
      const [stream] = streams;

      if (stream) {
        this.upsertRemoteStream(targetSocketId, stream);
      }
    };

    peer.onconnectionstatechange = () => {
      if (['closed', 'failed', 'disconnected'].includes(peer.connectionState)) {
        this.removeRemoteStream(targetSocketId);
      }
    };

    this.peers.set(targetSocketId, peer);

    return peer;
  }

  private async replacePeerTracks(
    peer: RTCPeerConnection,
    localStream: MediaStream | null,
  ): Promise<void> {
    const senders = peer.getSenders();
    const audioTrack = localStream?.getAudioTracks()[0] ?? null;
    const videoTrack = localStream?.getVideoTracks()[0] ?? null;

    await Promise.all([
      this.replaceSenderTrack(peer, senders, 'audio', audioTrack, localStream),
      this.replaceSenderTrack(peer, senders, 'video', videoTrack, localStream),
    ]);
  }

  private async replaceSenderTrack(
    peer: RTCPeerConnection,
    senders: RTCRtpSender[],
    kind: 'audio' | 'video',
    track: MediaStreamTrack | null,
    localStream: MediaStream | null,
  ): Promise<void> {
    const sender = senders.find((current) => current.track?.kind === kind);

    if (sender) {
      await sender.replaceTrack(track);
      return;
    }

    if (track && localStream) {
      peer.addTrack(track, localStream);
    }
  }

  private upsertRemoteStream(socketId: string, stream: MediaStream): void {
    const streams = this.remoteStreams();

    if (streams.some((remoteStream) => remoteStream.socketId === socketId)) {
      this.remoteStreams.set(
        streams.map((remoteStream) =>
          remoteStream.socketId === socketId
            ? { socketId, stream }
            : remoteStream,
        ),
      );
      return;
    }

    this.remoteStreams.set([...streams, { socketId, stream }]);
  }

  private removeRemoteStream(socketId: string): void {
    this.remoteStreams.set(
      this.remoteStreams().filter((stream) => stream.socketId !== socketId),
    );
  }
}
