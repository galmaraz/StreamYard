import { RoomMessage } from './room-message.entity';

export type RoomMessageResponse = {
  id: string;
  roomId: string;
  participantId: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: Date;
};

export function toRoomMessageResponse(
  message: RoomMessage,
): RoomMessageResponse {
  return {
    id: message.id,
    roomId: message.roomId,
    participantId: message.participantId,
    userId: message.userId,
    displayName: message.displayName,
    content: message.content,
    createdAt: message.createdAt,
  };
}
