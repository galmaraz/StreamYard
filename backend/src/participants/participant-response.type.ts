import { Participant } from './participant.entity';

export type ParticipantResponse = {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  participantRole: string;
  socketId: string | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  handRaised: boolean;
  joinedAt: Date;
  leftAt: Date | null;
};

export function toParticipantResponse(
  participant: Participant,
): ParticipantResponse {
  return {
    id: participant.id,
    roomId: participant.roomId,
    userId: participant.userId,
    displayName: participant.displayName,
    participantRole: participant.participantRole,
    socketId: participant.socketId,
    micEnabled: participant.micEnabled,
    cameraEnabled: participant.cameraEnabled,
    handRaised: participant.handRaised,
    joinedAt: participant.joinedAt,
    leftAt: participant.leftAt,
  };
}
