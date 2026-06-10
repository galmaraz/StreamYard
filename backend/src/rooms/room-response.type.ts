import { RoomStatus } from './room-status.enum';
import { Room } from './room.entity';

export type RoomResponse = {
  id: string;
  title: string;
  slug: string;
  status: RoomStatus;
  isPrivate: boolean;
  accessCode?: string;
  hostId: string;
  invitationPath: string;
  watchPath: string;
  createdAt: Date;
  updatedAt: Date;
  endedAt: Date | null;
};

export function toRoomResponse(
  room: Room,
  options: { includeAccessCode?: boolean } = {},
): RoomResponse {
  return {
    id: room.id,
    title: room.title,
    slug: room.slug,
    status: room.status,
    isPrivate: room.isPrivate,
    accessCode: options.includeAccessCode ? room.accessCode : undefined,
    hostId: room.hostId,
    invitationPath: `/join/${room.slug}`,
    watchPath: `/watch/${room.slug}`,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    endedAt: room.endedAt,
  };
}
