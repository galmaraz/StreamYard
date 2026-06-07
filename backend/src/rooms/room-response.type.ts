import { RoomStatus } from './room-status.enum';
import { Room } from './room.entity';

export type RoomResponse = {
  id: string;
  title: string;
  slug: string;
  status: RoomStatus;
  isPrivate: boolean;
  hostId: string;
  invitationPath: string;
  createdAt: Date;
  updatedAt: Date;
  endedAt: Date | null;
};

export function toRoomResponse(room: Room): RoomResponse {
  return {
    id: room.id,
    title: room.title,
    slug: room.slug,
    status: room.status,
    isPrivate: room.isPrivate,
    hostId: room.hostId,
    invitationPath: `/join/${room.slug}`,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    endedAt: room.endedAt,
  };
}
