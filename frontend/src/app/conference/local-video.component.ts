import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnChanges,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-local-video',
  template: `
    <article class="local-card" [class.compact]="compact" [class.camera-off]="!cameraEnabled">
      <video
        #video
        autoplay
        muted
        playsinline
        [class.hidden]="!cameraEnabled || !mediaReady"
      ></video>
      @if (!mediaReady) {
        <div class="video-placeholder">Esperando permisos de camara y microfono</div>
      }
      @if (mediaReady && !cameraEnabled) {
        <div class="video-placeholder">Camara apagada</div>
      }
      <div class="video-meta">
        <span>LOCAL</span>
        <strong>{{ label }}</strong>
        <small>
          {{ micEnabled ? 'Mic activo' : 'Mic silenciado' }} ·
          {{ cameraEnabled ? 'Cam activa' : 'Cam apagada' }}
        </small>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 0;
    }

    :host.compact-host {
      min-height: 96px;
    }

    .local-card {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: end;
      height: 100%;
      min-height: 100%;
      padding: 20px;
      border: 1px solid rgb(255 255 255 / 0.1);
      border-radius: 8px;
      background: #1e293b;
      box-shadow: 0 18px 60px rgb(0 0 0 / 0.22);
      overflow: hidden;
    }

    .local-card.compact {
      min-height: 96px;
      padding: 10px;
    }

    video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }

    video.hidden {
      opacity: 0;
    }

    .local-card::after {
      position: absolute;
      inset: auto 0 0;
      height: 45%;
      background: linear-gradient(transparent, rgb(0 0 0 / 0.7));
      content: "";
    }

    .video-placeholder {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      color: #dbeafe;
      font-weight: 900;
      text-align: center;
    }

    .video-meta {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 5px;
      max-width: 100%;
      text-shadow: 0 1px 8px rgb(0 0 0 / 0.45);
    }

    .video-meta span {
      width: fit-content;
      padding: 5px 8px;
      border-radius: 6px;
      background: #e11d48;
      color: #ffffff;
      font-size: 0.74rem;
      font-weight: 900;
      letter-spacing: 0.08em;
    }

    .video-meta strong {
      overflow: hidden;
      color: #ffffff;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .video-meta small {
      color: #dbeafe;
      font-weight: 800;
    }

    .local-card.compact .video-meta {
      gap: 2px;
    }

    .local-card.compact .video-meta small {
      display: none;
    }
  `],
})
export class LocalVideoComponent implements AfterViewInit, OnChanges {
  @Input()
  stream: MediaStream | null = null;

  @Input()
  label = 'Tu camara';

  @Input()
  micEnabled = true;

  @Input()
  cameraEnabled = true;

  @Input()
  mediaReady = false;

  @Input()
  compact = false;

  @HostBinding('class.compact-host')
  protected get compactHost(): boolean {
    return this.compact;
  }

  @ViewChild('video')
  private video?: ElementRef<HTMLVideoElement>;

  ngAfterViewInit(): void {
    this.attachStream();
  }

  ngOnChanges(): void {
    queueMicrotask(() => this.attachStream());
  }

  private attachStream(): void {
    const video = this.video?.nativeElement;

    if (video && video.srcObject !== this.stream) {
      video.srcObject = this.stream;
    }
  }
}
