import {
  IsBoolean,
  IsHexColor,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  BannerSize,
  BannerStyle,
  SceneMediaCommand,
  SceneMediaType,
  ScenePreset,
  StageLayout,
} from '../room-scene-state.type';

const stageLayouts: StageLayout[] = ['fullscreen', 'mainGuests', 'grid'];
const scenePresets: ScenePreset[] = [
  'midnight',
  'studioBlue',
  'emerald',
  'sunset',
  'custom',
];
const bannerStyles: BannerStyle[] = ['lowerThird', 'ticker', 'headline'];
const bannerSizes: BannerSize[] = ['small', 'medium', 'large'];
const sceneMediaTypes: SceneMediaType[] = ['none', 'video'];
const sceneMediaCommands: SceneMediaCommand[] = [
  'none',
  'play',
  'pause',
  'restart',
];

export class RoomSceneEventDto {
  @IsOptional()
  @IsIn(stageLayouts)
  stageLayout?: StageLayout;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  mainParticipantId?: string | null;

  @IsOptional()
  @IsIn(scenePresets)
  scenePreset?: ScenePreset;

  @IsOptional()
  @IsHexColor()
  sceneBackground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sceneBackgroundImageUrl?: string;

  @IsOptional()
  @IsHexColor()
  sceneAccent?: string;

  @IsOptional()
  @IsBoolean()
  bannerVisible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bannerText?: string;

  @IsOptional()
  @IsIn(bannerStyles)
  bannerStyle?: BannerStyle;

  @IsOptional()
  @IsIn(bannerSizes)
  bannerSize?: BannerSize;

  @IsOptional()
  @IsHexColor()
  bannerBackground?: string;

  @IsOptional()
  @IsHexColor()
  bannerTextColor?: string;

  @IsOptional()
  @IsIn(sceneMediaTypes)
  sceneMediaType?: SceneMediaType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sceneMediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sceneMediaTitle?: string;

  @IsOptional()
  @IsBoolean()
  sceneMediaVisible?: boolean;

  @IsOptional()
  @IsIn(sceneMediaCommands)
  sceneMediaCommand?: SceneMediaCommand;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sceneMediaCommandId?: string;
}
