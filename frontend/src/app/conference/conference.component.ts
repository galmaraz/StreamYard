import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import {
  BannerStyle,
  Participant,
  Room,
  RoomSceneState,
  ScenePreset,
  StageLayout,
} from '../core/models';
import { ChatService } from '../chat/chat.service';
import { ParticipantsApiService } from '../participants/participants-api.service';
import { RoomAccessService } from '../rooms/room-access.service';
import { RoomsService } from '../rooms/rooms.service';
import { MediaDevicesService } from './media-devices.service';
import { RealtimeService } from './realtime.service';
import { LocalVideoComponent } from './local-video.component';
import { RemoteVideoComponent } from './remote-video.component';
import { WebrtcService } from './webrtc.service';

interface ScenePresetOption {
  label: string;
  value: ScenePreset;
  background: string;
  accent: string;
}

type SceneTextItem = {
  id: string;
  label: string;
  text: string;
};

const SCENE_MEDIA_PARTICIPANT_ID = 'scene-media-source';

@Component({
  selector: 'app-conference',
  imports: [FormsModule, RouterLink, LocalVideoComponent, RemoteVideoComponent],
  templateUrl: './conference.component.html',
  styleUrl: './conference.component.scss',
})
export class ConferenceComponent implements OnInit, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private lastSceneMediaCommandId: string | null = null;

  @ViewChild('sceneYoutubeFrame')
  private sceneYoutubeFrame?: ElementRef<HTMLIFrameElement>;

  protected room = signal<Room | null>(null);
  protected error = signal<string | null>(null);
  protected mediaError = computed(() => this.mediaDevicesService.mediaError());
  protected mediaReady = computed(() => this.mediaDevicesService.mediaReady());
  protected localStream = computed(() => this.mediaDevicesService.localStream());
  protected screenSharing = computed(() => this.mediaDevicesService.screenSharing());
  protected localVideoVisible = computed(
    () => this.cameraEnabled() || this.screenSharing(),
  );
  protected localVideoLabel = computed(() =>
    this.screenSharing()
      ? `${this.me()?.displayName ?? 'Tu pantalla'} · Pantalla`
      : this.me()?.displayName || 'Tu camara',
  );
  protected joining = signal(false);
  protected micEnabled = signal(true);
  protected cameraEnabled = signal(true);
  protected participants = computed(() => this.realtimeService.participants());
  protected liveParticipants = computed(() =>
    this.participants().filter(
      (participant) => participant.participantRole !== 'spectator',
    ),
  );
  protected spectatorCount = computed(() => this.realtimeService.spectatorCount());
  protected messages = computed(() => this.realtimeService.messages());
  protected remoteStreams = computed(() => this.webrtcService.remoteStreams());
  protected connected = computed(() => this.realtimeService.connected());
  protected me = computed(() => this.realtimeService.participant());
  protected kicked = computed(() => this.realtimeService.kicked());
  protected isHost = computed(() => this.room()?.hostId === this.me()?.userId);
  protected lastSignal = computed(() => this.realtimeService.lastSignal());
  protected chatMessage = '';
  protected activeSidePanel = signal<'participants' | 'chat' | 'scene'>(
    'participants',
  );
  protected sendingMessage = signal(false);
  protected stageLayout = signal<StageLayout>('mainGuests');
  protected selectedMainParticipantId = signal<string | null>(null);
  protected scenePreset = signal<ScenePreset>('studioBlue');
  protected sceneBackground = signal('#07111f');
  protected sceneBackgroundImageUrl = signal('');
  protected sceneBackgroundImageCss = computed(() => {
    const url = this.sceneBackgroundImageUrl().trim();

    return url ? `url("${url.replaceAll('"', '%22')}")` : 'none';
  });
  protected sceneAccent = signal('#38bdf8');
  protected bannerVisible = signal(true);
  protected bannerText = signal('Bienvenidos a nuestra transmision en vivo');
  protected bannerStyle = signal<BannerStyle>('lowerThird');
  protected bannerSize = signal<RoomSceneState['bannerSize']>('medium');
  protected bannerBackground = signal('#0f172a');
  protected bannerTextColor = signal('#ffffff');
  protected sceneMediaType = signal<RoomSceneState['sceneMediaType']>('none');
  protected sceneMediaUrl = signal('');
  protected sceneMediaTitle = signal('Video de YouTube');
  protected sceneMediaVisible = signal(false);
  protected sceneMediaActive = computed(
    () =>
      this.sceneMediaVisible() &&
      this.sceneMediaType() === 'video' &&
      Boolean(this.sceneYoutubeVideoId()),
  );
  protected sceneVideoActive = computed(() => this.sceneMediaActive());
  protected sceneYoutubeVideoId = computed(() =>
    this.extractYoutubeVideoId(this.sceneMediaUrl()),
  );
  protected sceneYoutubeEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const videoId = this.sceneYoutubeVideoId();

    if (!this.sceneVideoActive() || !videoId) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`,
    );
  });
  protected sceneTextLabel = '';
  protected sceneTextValue = '';
  protected editingSceneTextId = signal<string | null>(null);
  protected sceneTexts = signal<SceneTextItem[]>([
    {
      id: 'welcome',
      label: 'Bienvenida',
      text: 'Bienvenidos a nuestra transmision en vivo',
    },
    {
      id: 'questions',
      label: 'Preguntas',
      text: 'Deja tus preguntas en los comentarios',
    },
  ]);
  protected scenePresetOptions: ScenePresetOption[] = [
    {
      label: 'Studio blue',
      value: 'studioBlue',
      background: '#07111f',
      accent: '#38bdf8',
    },
    {
      label: 'Midnight',
      value: 'midnight',
      background: '#050816',
      accent: '#a78bfa',
    },
    {
      label: 'Emerald',
      value: 'emerald',
      background: '#052e2b',
      accent: '#34d399',
    },
    {
      label: 'Sunset',
      value: 'sunset',
      background: '#21110b',
      accent: '#fb923c',
    },
  ];
  protected mainParticipantId = computed(
    () =>
      this.selectedMainParticipantId() ??
      this.liveParticipants()[0]?.id ??
      this.me()?.id ??
      null,
  );
  protected gridTileCount = computed(
    () => this.remoteStreams().length + 1 + (this.sceneVideoActive() ? 1 : 0),
  );
  protected gridSizeClass = computed(() => {
    const tileCount = this.gridTileCount();

    if (tileCount === 1) {
      return 'grid-one';
    }

    if (tileCount === 2) {
      return 'grid-two';
    }

    if (tileCount === 3) {
      return 'grid-three';
    }

    return 'grid-many';
  });
  protected isLocalMain = computed(() => this.mainParticipantId() === this.me()?.id);
  protected isSceneMediaMain = computed(
    () => this.mainParticipantId() === SCENE_MEDIA_PARTICIPANT_ID,
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly chatService: ChatService,
    private readonly roomsService: RoomsService,
    private readonly roomAccessService: RoomAccessService,
    private readonly participantsApiService: ParticipantsApiService,
    private readonly realtimeService: RealtimeService,
    private readonly mediaDevicesService: MediaDevicesService,
    private readonly webrtcService: WebrtcService,
  ) {
    effect(() => {
      const participant = this.me();

      if (participant) {
        this.syncLocalState(participant);
      }
    });
    effect(() => {
      const sceneState = this.realtimeService.roomSceneState();

      if (sceneState) {
        this.applySceneState(sceneState);
        this.applySceneMediaCommand(sceneState);
      }
    });
    effect(() => {
      const version = this.mediaDevicesService.screenShareVersion();

      if (version > 0) {
        void this.webrtcService.updateLocalStream(this.localStream());
      }
    });
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (!slug) {
      this.error.set('Sala no encontrada.');
      return;
    }

    this.roomsService.getInviteRoom(slug).subscribe({
      next: (room) => {
        this.room.set(room);
        void this.join(room.slug);
      },
      error: () => this.error.set('No se pudo cargar la sala.'),
    });
  }

  ngOnDestroy(): void {
    this.realtimeService.leaveRoom();
    this.webrtcService.dispose();
    this.mediaDevicesService.stopLocalMedia();
  }

  protected async toggleMic(): Promise<void> {
    const nextValue = !this.micEnabled();
    this.mediaDevicesService.setMicEnabled(nextValue);
    const participant = await this.realtimeService.toggleMic(nextValue);
    this.syncLocalState(participant);
  }

  protected async toggleCamera(): Promise<void> {
    const nextValue = !this.cameraEnabled();
    this.mediaDevicesService.setCameraEnabled(nextValue);
    const participant = await this.realtimeService.toggleCamera(nextValue);
    this.syncLocalState(participant);
  }

  protected async toggleScreenShare(): Promise<void> {
    if (this.screenSharing()) {
      await this.stopScreenShare();
      return;
    }

    await this.startScreenShare();
  }

  protected async startScreenShare(): Promise<void> {
    try {
      const stream = await this.mediaDevicesService.startScreenShare();
      this.mediaDevicesService.setMicEnabled(this.micEnabled());
      await this.webrtcService.updateLocalStream(stream);
    } catch {
      this.error.set('No se pudo iniciar la captura de pantalla.');
    }
  }

  protected async stopScreenShare(): Promise<void> {
    const stream = this.mediaDevicesService.stopScreenShare();
    this.mediaDevicesService.setMicEnabled(this.micEnabled());
    this.mediaDevicesService.setCameraEnabled(this.cameraEnabled());
    await this.webrtcService.updateLocalStream(stream);
  }

  protected async toggleHand(): Promise<void> {
    const participant = this.me();

    if (!participant) {
      return;
    }

    await this.realtimeService.raiseHand(!participant.handRaised);
  }

  protected async toggleParticipantMic(participant: Participant): Promise<void> {
    await this.realtimeService.moderateParticipant(participant.id, {
      micEnabled: !participant.micEnabled,
    });
  }

  protected async toggleParticipantCamera(participant: Participant): Promise<void> {
    await this.realtimeService.moderateParticipant(participant.id, {
      cameraEnabled: !participant.cameraEnabled,
    });
  }

  protected async lowerHand(participant: Participant): Promise<void> {
    await this.realtimeService.moderateParticipant(participant.id, {
      handRaised: false,
    });
  }

  protected async kickParticipant(participant: Participant): Promise<void> {
    await this.realtimeService.kickParticipant(participant.id);
  }

  protected async sendChatMessage(): Promise<void> {
    const content = this.chatMessage.trim();

    if (!content) {
      return;
    }

    this.sendingMessage.set(true);

    try {
      await this.realtimeService.sendChatMessage(content);
      this.chatMessage = '';
    } finally {
      this.sendingMessage.set(false);
    }
  }

  protected showParticipantsPanel(): void {
    this.activeSidePanel.set('participants');
  }

  protected showChatPanel(): void {
    this.activeSidePanel.set('chat');
  }

  protected showScenePanel(): void {
    this.activeSidePanel.set('scene');
  }

  protected setStageLayout(layout: StageLayout): void {
    this.stageLayout.set(layout);
    this.publishSceneState({ stageLayout: layout });
  }

  protected setScenePreset(preset: ScenePreset): void {
    const selectedPreset = this.scenePresetOptions.find(
      (option) => option.value === preset,
    );

    this.scenePreset.set(preset);

    if (selectedPreset) {
      this.sceneBackground.set(selectedPreset.background);
      this.sceneAccent.set(selectedPreset.accent);
      this.publishSceneState({
        scenePreset: preset,
        sceneBackground: selectedPreset.background,
        sceneAccent: selectedPreset.accent,
      });
      return;
    }

    this.publishSceneState({ scenePreset: preset });
  }

  protected setSceneBackground(color: string): void {
    this.scenePreset.set('custom');
    this.sceneBackground.set(color);
    this.publishSceneState({
      scenePreset: 'custom',
      sceneBackground: color,
    });
  }

  protected setSceneBackgroundImageUrl(url: string): void {
    this.sceneBackgroundImageUrl.set(url);
    this.publishSceneState({ sceneBackgroundImageUrl: url });
  }

  protected clearSceneBackgroundImage(): void {
    this.setSceneBackgroundImageUrl('');
  }

  protected setSceneAccent(color: string): void {
    this.scenePreset.set('custom');
    this.sceneAccent.set(color);
    this.publishSceneState({
      scenePreset: 'custom',
      sceneAccent: color,
    });
  }

  protected setBannerText(text: string): void {
    this.bannerText.set(text);
    this.publishSceneState({ bannerText: text });
  }

  protected saveSceneText(): void {
    const label = this.sceneTextLabel.trim();
    const text = this.sceneTextValue.trim();

    if (!label || !text) {
      return;
    }

    const editingId = this.editingSceneTextId();

    if (editingId) {
      this.sceneTexts.update((items) =>
        items.map((item) =>
          item.id === editingId ? { ...item, label, text } : item,
        ),
      );
    } else {
      this.sceneTexts.update((items) => [
        ...items,
        {
          id: crypto.randomUUID(),
          label,
          text,
        },
      ]);
    }

    this.sceneTextLabel = '';
    this.sceneTextValue = '';
    this.editingSceneTextId.set(null);
  }

  protected editSceneText(item: SceneTextItem): void {
    this.sceneTextLabel = item.label;
    this.sceneTextValue = item.text;
    this.editingSceneTextId.set(item.id);
  }

  protected deleteSceneText(item: SceneTextItem): void {
    this.sceneTexts.update((items) =>
      items.filter((current) => current.id !== item.id),
    );

    if (this.editingSceneTextId() === item.id) {
      this.sceneTextLabel = '';
      this.sceneTextValue = '';
      this.editingSceneTextId.set(null);
    }
  }

  protected useSceneText(item: SceneTextItem): void {
    this.setBannerText(item.text);
    this.bannerVisible.set(true);
    this.publishSceneState({
      bannerText: item.text,
      bannerVisible: true,
    });
  }

  protected setSceneMediaUrl(url: string): void {
    const trimmedUrl = url.trim();
    const youtubeVideoId = this.extractYoutubeVideoId(trimmedUrl);
    const sceneMediaVisible = Boolean(youtubeVideoId);
    const sceneMediaType: RoomSceneState['sceneMediaType'] = youtubeVideoId
      ? 'video'
      : 'none';

    this.sceneMediaUrl.set(url);
    this.sceneMediaType.set(sceneMediaType);
    this.sceneMediaVisible.set(sceneMediaVisible);
    this.publishSceneState({
      sceneMediaType,
      sceneMediaUrl: url,
      sceneMediaVisible,
    });

    if (trimmedUrl && !youtubeVideoId) {
      this.error.set('Ingresa una URL valida de YouTube para la escena.');
    }
  }

  protected setSceneMediaTitle(title: string): void {
    this.sceneMediaTitle.set(title);
    this.publishSceneState({ sceneMediaTitle: title });
  }

  protected toggleSceneMedia(): void {
    if (!this.sceneYoutubeVideoId()) {
      this.error.set('Primero ingresa una URL valida de YouTube.');
      return;
    }

    const nextValue = !this.sceneMediaVisible();

    this.sceneMediaVisible.set(nextValue);
    this.sceneMediaType.set('video');
    this.publishSceneState({
      sceneMediaType: 'video',
      sceneMediaVisible: nextValue,
    });
  }

  protected clearSceneMedia(): void {
    this.sceneMediaType.set('none');
    this.sceneMediaUrl.set('');
    this.sceneMediaVisible.set(false);
    this.selectedMainParticipantId.set(null);
    this.publishSceneState({
      mainParticipantId: null,
      sceneMediaType: 'none',
      sceneMediaUrl: '',
      sceneMediaVisible: false,
    });
  }

  protected playSceneMedia(): void {
    this.sendSceneMediaCommand('play');
  }

  protected pauseSceneMedia(): void {
    this.sendSceneMediaCommand('pause');
  }

  protected restartSceneMedia(): void {
    this.sendSceneMediaCommand('restart');
  }

  protected setBannerStyle(style: BannerStyle): void {
    this.bannerStyle.set(style);
    this.publishSceneState({ bannerStyle: style });
  }

  protected setBannerSize(size: RoomSceneState['bannerSize']): void {
    this.bannerSize.set(size);
    this.publishSceneState({ bannerSize: size });
  }

  protected setBannerBackground(color: string): void {
    this.bannerBackground.set(color);
    this.publishSceneState({ bannerBackground: color });
  }

  protected setBannerTextColor(color: string): void {
    this.bannerTextColor.set(color);
    this.publishSceneState({ bannerTextColor: color });
  }

  protected toggleBanner(): void {
    const nextValue = !this.bannerVisible();

    this.bannerVisible.set(nextValue);
    this.publishSceneState({ bannerVisible: nextValue });
  }

  protected featureLocal(): void {
    const participant = this.me();

    if (participant) {
      this.selectedMainParticipantId.set(participant.id);
      this.publishSceneState({ mainParticipantId: participant.id });
    }
  }

  protected featureSceneMedia(): void {
    if (!this.sceneVideoActive()) {
      return;
    }

    this.stageLayout.set('fullscreen');
    this.selectedMainParticipantId.set(SCENE_MEDIA_PARTICIPANT_ID);
    this.publishSceneState({
      stageLayout: 'fullscreen',
      mainParticipantId: SCENE_MEDIA_PARTICIPANT_ID,
    });
  }

  protected featureParticipant(participant: Participant): void {
    this.selectedMainParticipantId.set(participant.id);
    this.publishSceneState({ mainParticipantId: participant.id });
  }

  protected isFeatured(participant: Participant): boolean {
    return this.mainParticipantId() === participant.id;
  }

  protected leaveConference(): void {
    void this.router.navigateByUrl('/dashboard');
  }

  protected isSelf(participant: Participant): boolean {
    return this.me()?.id === participant.id;
  }

  protected participantBySocket(socketId: string): Participant | null {
    return (
      this.participants().find((participant) => participant.socketId === socketId) ??
      null
    );
  }

  protected isRemoteFeatured(socketId: string): boolean {
    const participant = this.participantBySocket(socketId);

    return Boolean(participant && this.mainParticipantId() === participant.id);
  }

  protected hasMainRemote(): boolean {
    if (this.isSceneMediaMain() && this.sceneVideoActive()) {
      return true;
    }

    return this.remoteStreams().some((remote) =>
      this.isRemoteFeatured(remote.socketId),
    );
  }

  protected participantNameBySocket(socketId: string): string {
    return (
      this.participants().find((participant) => participant.socketId === socketId)
        ?.displayName ?? 'Participante remoto'
    );
  }

  private async join(slug: string): Promise<void> {
    this.joining.set(true);
    this.error.set(null);

    try {
      const localMediaPromise = this.mediaDevicesService
        .startLocalMedia()
        .catch(() => null);
      const participant = await this.realtimeService.joinRoom(
        slug,
        undefined,
        this.roomAccessService.getAccessCode(slug),
      );
      this.syncLocalState(participant);
      this.loadChatHistory(slug);
      this.loadParticipantsAndConnect(slug, participant, localMediaPromise);
    } catch {
      this.error.set(
        'No se pudo conectar a la sala. Verifica la clave de acceso.',
      );
    } finally {
      this.joining.set(false);
    }
  }

  private syncLocalState(participant: Participant): void {
    this.micEnabled.set(participant.micEnabled);
    this.cameraEnabled.set(participant.cameraEnabled);
    this.mediaDevicesService.setMicEnabled(participant.micEnabled);
    this.mediaDevicesService.setCameraEnabled(participant.cameraEnabled);
  }

  private applySceneState(sceneState: RoomSceneState): void {
    this.stageLayout.set(sceneState.stageLayout);
    this.selectedMainParticipantId.set(sceneState.mainParticipantId);
    this.scenePreset.set(sceneState.scenePreset);
    this.sceneBackground.set(sceneState.sceneBackground);
    this.sceneBackgroundImageUrl.set(sceneState.sceneBackgroundImageUrl ?? '');
    this.sceneAccent.set(sceneState.sceneAccent);
    this.bannerVisible.set(sceneState.bannerVisible);
    this.bannerText.set(sceneState.bannerText);
    this.bannerStyle.set(sceneState.bannerStyle);
    this.bannerSize.set(sceneState.bannerSize ?? 'medium');
    this.bannerBackground.set(sceneState.bannerBackground);
    this.bannerTextColor.set(sceneState.bannerTextColor);
    this.sceneMediaType.set(sceneState.sceneMediaType ?? 'none');
    this.sceneMediaUrl.set(sceneState.sceneMediaUrl ?? '');
    this.sceneMediaTitle.set(sceneState.sceneMediaTitle ?? 'Video de YouTube');
    this.sceneMediaVisible.set(sceneState.sceneMediaVisible ?? false);
  }

  private sendSceneMediaCommand(
    command: Exclude<RoomSceneState['sceneMediaCommand'], 'none'>,
  ): void {
    if (!this.sceneVideoActive()) {
      this.error.set('Primero activa un video de YouTube en la escena.');
      return;
    }

    const sceneMediaCommandId = crypto.randomUUID();

    this.lastSceneMediaCommandId = sceneMediaCommandId;
    this.postYoutubeCommand(command);
    this.publishSceneState({
      sceneMediaCommand: command,
      sceneMediaCommandId,
    });
  }

  private applySceneMediaCommand(sceneState: RoomSceneState): void {
    if (
      !sceneState.sceneMediaCommandId ||
      sceneState.sceneMediaCommandId === this.lastSceneMediaCommandId ||
      sceneState.sceneMediaCommand === 'none'
    ) {
      return;
    }

    this.lastSceneMediaCommandId = sceneState.sceneMediaCommandId;
    queueMicrotask(() => this.postYoutubeCommand(sceneState.sceneMediaCommand));
  }

  private postYoutubeCommand(command: RoomSceneState['sceneMediaCommand']): void {
    const iframe = this.sceneYoutubeFrame?.nativeElement;

    if (!iframe?.contentWindow) {
      return;
    }

    if (command === 'restart') {
      this.sendYoutubeMessage('seekTo', [0, true]);
      this.sendYoutubeMessage('playVideo');
      return;
    }

    if (command === 'play') {
      this.sendYoutubeMessage('playVideo');
    }

    if (command === 'pause') {
      this.sendYoutubeMessage('pauseVideo');
    }
  }

  private sendYoutubeMessage(func: string, args: unknown[] = []): void {
    this.sceneYoutubeFrame?.nativeElement.contentWindow?.postMessage(
      JSON.stringify({
        event: 'command',
        func,
        args,
      }),
      'https://www.youtube.com',
    );
  }

  private publishSceneState(sceneState: Partial<RoomSceneState>): void {
    if (!this.isHost()) {
      return;
    }

    this.realtimeService.updateRoomSceneState(sceneState).catch(() => {
      this.error.set('No se pudo sincronizar la escena con la sala.');
    });
  }

  private loadParticipantsAndConnect(
    slug: string,
    currentParticipant: Participant,
    localMedia: Promise<MediaStream | null>,
  ): void {
    this.participantsApiService.getActiveParticipants(slug).subscribe({
      next: (participants) => {
        this.realtimeService.setParticipants(participants);
        void localMedia.then((stream) => {
          if (!stream) {
            return;
          }

          this.webrtcService.initialize(slug, stream);
          void this.webrtcService.connectToExistingParticipants(
            participants,
            currentParticipant,
          );
        });
      },
      error: () => this.error.set('No se pudieron cargar participantes.'),
    });
  }

  private loadChatHistory(slug: string): void {
    this.chatService.getRecentMessages(slug).subscribe({
      next: (messages) => this.realtimeService.setMessages(messages),
      error: () => this.error.set('No se pudo cargar el historial del chat.'),
    });
  }

  private extractYoutubeVideoId(url: string): string | null {
    try {
      const parsedUrl = new URL(url.trim());
      const hostname = parsedUrl.hostname.replace(/^www\./, '');

      if (hostname === 'youtu.be') {
        return parsedUrl.pathname.split('/').filter(Boolean)[0] ?? null;
      }

      if (!hostname.endsWith('youtube.com')) {
        return null;
      }

      if (parsedUrl.pathname === '/watch') {
        return parsedUrl.searchParams.get('v');
      }

      const [kind, id] = parsedUrl.pathname.split('/').filter(Boolean);

      if (['embed', 'shorts', 'live'].includes(kind)) {
        return id ?? null;
      }

      return null;
    } catch {
      return null;
    }
  }
}
