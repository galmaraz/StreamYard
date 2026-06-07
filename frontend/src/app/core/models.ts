export type UserRole = 'admin' | 'host' | 'guest' | 'viewer';

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type RoomStatus = 'active' | 'ended';

export type Room = {
  id: string;
  title: string;
  slug: string;
  status: RoomStatus;
  isPrivate: boolean;
  hostId: string;
  invitationPath: string;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
};

export type Participant = {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  socketId: string | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  handRaised: boolean;
  joinedAt: string;
  leftAt: string | null;
};

export type RoomMessage = {
  id: string;
  roomId: string;
  participantId: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: string;
};
