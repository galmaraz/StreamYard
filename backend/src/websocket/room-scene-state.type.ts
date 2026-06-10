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

export const DEFAULT_ROOM_SCENE_STATE: RoomSceneState = {
  stageLayout: 'mainGuests',
  mainParticipantId: null,
  scenePreset: 'studioBlue',
  sceneBackground: '#07111f',
  sceneBackgroundImageUrl: '',
  sceneAccent: '#38bdf8',
  bannerVisible: true,
  bannerText: 'Bienvenidos a nuestra transmision en vivo',
  bannerStyle: 'lowerThird',
  bannerSize: 'medium',
  bannerBackground: '#0f172a',
  bannerTextColor: '#ffffff',
  sceneMediaType: 'none',
  sceneMediaUrl: '',
  sceneMediaTitle: 'Video de YouTube',
  sceneMediaVisible: false,
  sceneMediaCommand: 'none',
  sceneMediaCommandId: '',
};
