import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { AuthService } from '../auth/auth.service';
import { Participant, Room, RoomSceneState } from '../core/models';
import { ParticipantsApiService } from '../participants/participants-api.service';
import { RoomAccessService } from '../rooms/room-access.service';
import { RoomsService } from '../rooms/rooms.service';
import { RemoteVideoComponent } from '../conference/remote-video.component';
import { RealtimeService } from '../conference/realtime.service';
import { WebrtcService } from '../conference/webrtc.service';

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const SCENE_MEDIA_PARTICIPANT_ID = 'scene-media-source';

@Component({
  selector: 'app-broadcast-view',
  imports: [FormsModule, RemoteVideoComponent],
  templateUrl: './broadcast-view.component.html',
  styleUrl: './broadcast-view.component.scss',
})
export class BroadcastViewComponent implements OnInit, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private lastSceneMediaCommandId: string | null = null;

  @ViewChild('broadcastShell')
  private broadcastShell?: ElementRef<HTMLElement>;

  @ViewChild('sceneYoutubeFrame')
  private sceneYoutubeFrame?: ElementRef<HTMLIFrameElement>;

  protected room = signal<Room | null>(null);
  protected displayName = 'Espectador';
  protected accessCode = '';
  protected loading = signal(false);
  protected joined = signal(false);
  protected fullscreen = signal(false);
  protected fallbackFullscreen = signal(false);
  protected error = signal<string | null>(null);
  protected remoteStreams = computed(() => this.webrtcService.remoteStreams());
  protected participants = computed(() => this.realtimeService.participants());
  protected stageLayout = signal<RoomSceneState['stageLayout']>('mainGuests');
  protected mainParticipantId = signal<string | null>(null);
  protected sceneBackground = signal('#07111f');
  protected sceneBackgroundImageUrl = signal('');
  protected sceneBackgroundImageCss = computed(() => {
    const url = this.sceneBackgroundImageUrl().trim();

    return url ? `url("${url.replaceAll('"', '%22')}")` : 'none';
  });
  protected sceneAccent = signal('#38bdf8');
  protected bannerVisible = signal(true);
  protected bannerText = signal('Bienvenidos a nuestra transmision en vivo');
  protected bannerStyle = signal<RoomSceneState['bannerStyle']>('lowerThird');
  protected bannerSize = signal<RoomSceneState['bannerSize']>('medium');
  protected bannerBackground = signal('#0f172a');
  protected bannerTextColor = signal('#ffffff');
  protected sceneMediaType = signal<RoomSceneState['sceneMediaType']>('none');
  protected sceneMediaUrl = signal('');
  protected sceneMediaTitle = signal('Video de escena');
  protected sceneMediaVisible = signal(false);
  protected sceneVideoActive = computed(
    () =>
      this.sceneMediaVisible() &&
      this.sceneMediaType() === 'video' &&
      Boolean(this.sceneYoutubeVideoId()),
  );
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
  protected isSceneMediaMain = computed(
    () => this.mainParticipantId() === SCENE_MEDIA_PARTICIPANT_ID,
  );
  protected mainRemote = computed(() => {
    const selectedId = this.mainParticipantId();
    const streams = this.remoteStreams();

    if (selectedId) {
      const selectedParticipant = this.participants().find(
        (participant) => participant.id === selectedId,
      );
      const selectedStream = streams.find(
        (stream) => stream.socketId === selectedParticipant?.socketId,
      );

      if (selectedStream) {
        return selectedStream;
      }
    }

    return streams[0] ?? null;
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly roomsService: RoomsService,
    private readonly roomAccessService: RoomAccessService,
    private readonly participantsApiService: ParticipantsApiService,
    private readonly realtimeService: RealtimeService,
    private readonly webrtcService: WebrtcService,
  ) {
    effect(() => {
      const sceneState = this.realtimeService.roomSceneState();

      if (sceneState) {
        this.applySceneState(sceneState);
        this.applySceneMediaCommand(sceneState);
      }
    });
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (!slug) {
      this.error.set('Transmision no encontrada.');
      return;
    }

    this.accessCode = this.roomAccessService.getAccessCode(slug) ?? '';
    this.roomsService.getInviteRoom(slug).subscribe({
      next: (room) => this.room.set(room),
      error: () => this.error.set('La transmision no existe o ya finalizo.'),
    });
  }

  ngOnDestroy(): void {
    this.realtimeService.leaveRoom();
    this.webrtcService.dispose();
  }

  protected watch(): void {
    const room = this.room();

    if (!room || this.displayName.trim().length < 2 || this.accessCode.trim().length < 3) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.guestLogin({ displayName: this.displayName.trim() }).subscribe({
      next: () => {
        this.roomAccessService.setAccessCode(room.slug, this.accessCode);
        void this.joinBroadcast(room.slug);
      },
      error: () => {
        this.error.set('No se pudo preparar el acceso de espectador.');
        this.loading.set(false);
      },
    });
  }

  protected participantNameBySocket(socketId: string): string {
    return (
      this.participants().find((participant) => participant.socketId === socketId)
        ?.displayName ?? 'Participante'
    );
  }

  protected isMainRemote(socketId: string): boolean {
    return this.mainRemote()?.socketId === socketId;
  }

  protected async toggleFullscreen(): Promise<void> {
    if (this.fullscreen()) {
      await this.exitFullscreen();
      return;
    }

    await this.enterFullscreen();
  }

  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange')
  protected onFullscreenChange(): void {
    this.fullscreen.set(this.fallbackFullscreen() || this.hasNativeFullscreen());
  }

  private async joinBroadcast(slug: string): Promise<void> {
    try {
      const participant = await this.realtimeService.joinRoom(
        slug,
        this.displayName.trim(),
        this.roomAccessService.getAccessCode(slug),
        'spectator',
      );

      this.joined.set(true);
      this.loading.set(false);
      this.loadParticipantsAndConnect(slug, participant);
    } catch {
      this.error.set('No se pudo entrar. Verifica la clave de acceso.');
      this.loading.set(false);
    }
  }

  private loadParticipantsAndConnect(slug: string, currentParticipant: Participant): void {
    this.participantsApiService.getActiveParticipants(slug).subscribe({
      next: (participants) => {
        this.realtimeService.setParticipants(participants);
        this.webrtcService.initialize(slug);
        void this.webrtcService.connectToExistingParticipants(
          participants.filter(
            (participant) => participant.participantRole !== 'spectator',
          ),
          currentParticipant,
        );
      },
      error: () => this.error.set('No se pudieron cargar participantes.'),
    });
  }

  private applySceneState(sceneState: RoomSceneState): void {
    this.stageLayout.set(sceneState.stageLayout);
    this.mainParticipantId.set(sceneState.mainParticipantId);
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
    if (!this.sceneYoutubeFrame?.nativeElement.contentWindow) {
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

  private async enterFullscreen(): Promise<void> {
    const element = this.broadcastShell?.nativeElement as
      | FullscreenElement
      | undefined;

    if (!element) {
      return;
    }

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else {
        this.fallbackFullscreen.set(true);
      }
    } catch {
      this.fallbackFullscreen.set(true);
    }

    this.fullscreen.set(this.fallbackFullscreen() || this.hasNativeFullscreen());
  }

  private async exitFullscreen(): Promise<void> {
    const fullscreenDocument = document as FullscreenDocument;

    this.fallbackFullscreen.set(false);

    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (
      fullscreenDocument.webkitFullscreenElement &&
      fullscreenDocument.webkitExitFullscreen
    ) {
      await fullscreenDocument.webkitExitFullscreen();
    }

    this.fullscreen.set(this.hasNativeFullscreen());
  }

  private hasNativeFullscreen(): boolean {
    const fullscreenDocument = document as FullscreenDocument;

    return Boolean(
      document.fullscreenElement || fullscreenDocument.webkitFullscreenElement,
    );
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
