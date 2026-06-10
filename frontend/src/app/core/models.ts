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
  accessCode?: string;
  hostId: string;
  invitationPath: string;
  watchPath: string;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
};

export type Participant = {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  participantRole: 'participant' | 'spectator';
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

export type StageLayout = 'fullscreen' | 'mainGuests' | 'grid';
export type ScenePreset = 'midnight' | 'studioBlue' | 'emerald' | 'sunset' | 'custom';
export type BannerStyle = 'lowerThird' | 'ticker' | 'headline';
export type BannerSize = 'small' | 'medium' | 'large';
export type SceneMediaType = 'none' | 'video';
export type SceneMediaCommand = 'none' | 'play' | 'pause' | 'restart';

export type RoomSceneState = {
  stageLayout: StageLayout;
  mainParticipantId: string | null;
  scenePreset: ScenePreset;
  sceneBackground: string;
  sceneBackgroundImageUrl: string;
  sceneAccent: string;
  bannerVisible: boolean;
  bannerText: string;
  bannerStyle: BannerStyle;
  bannerSize: BannerSize;
  bannerBackground: string;
  bannerTextColor: string;
  sceneMediaType: SceneMediaType;
  sceneMediaUrl: string;
  sceneMediaTitle: string;
  sceneMediaVisible: boolean;
  sceneMediaCommand: SceneMediaCommand;
  sceneMediaCommandId: string;
};
