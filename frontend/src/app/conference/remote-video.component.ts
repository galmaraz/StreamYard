import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnChanges,
  ViewChild,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-remote-video',
  template: `
    <article class="remote-card" [class.compact]="compact">
      <video #video autoplay playsinline></video>
      @if (audioBlocked() && !compact) {
        <button type="button" class="audio-button" (click)="enableAudio()">
          Activar audio
        </button>
      }
      <div class="remote-info">
        <strong>{{ label }}</strong>
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

    .remote-card {
      position: relative;
      display: grid;
      height: 100%;
      overflow: hidden;
      min-height: 100%;
      border: 1px solid rgb(255 255 255 / 0.1);
      border-radius: 8px;
      background: #1f2937;
    }

    video {
      width: 100%;
      height: 100%;
      min-height: 100%;
      object-fit: cover;
    }

    .remote-card.compact,
    .remote-card.compact video {
      min-height: 96px;
    }

    .remote-card.compact .remote-info {
      left: 10px;
      bottom: 10px;
      gap: 2px;
    }

    .remote-info {
      position: absolute;
      left: 12px;
      bottom: 12px;
      display: grid;
      gap: 4px;
      z-index: 1;
    }

    strong {
      width: fit-content;
      max-width: min(220px, calc(100vw - 56px));
      overflow: hidden;
      padding: 6px 9px;
      border-radius: 6px;
      background: rgb(15 23 42 / 0.72);
      color: #ffffff;
      text-overflow: ellipsis;
      text-shadow: 0 1px 8px rgb(0 0 0 / 0.45);
      white-space: nowrap;
    }

    .audio-button {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 2;
      min-height: 34px;
      padding: 0 10px;
      border: 0;
      border-radius: 8px;
      background: rgb(15 23 42 / 0.78);
      color: #ffffff;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 900;
      backdrop-filter: blur(10px);
    }

    .remote-card.compact .audio-button {
      top: 8px;
      right: 8px;
      min-height: 28px;
      padding: 0 8px;
      font-size: 0.7rem;
    }
  `],
})
export class RemoteVideoComponent implements AfterViewInit, OnChanges {
  protected audioBlocked = signal(false);

  @Input({ required: true })
  stream!: MediaStream;

  @Input()
  label = 'Participante remoto';

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

  protected async enableAudio(): Promise<void> {
    const video = this.video?.nativeElement;

    if (!video) {
      return;
    }

    video.muted = false;

    try {
      await video.play();
      this.audioBlocked.set(false);
    } catch {
      this.audioBlocked.set(true);
    }
  }

  private attachStream(): void {
    const video = this.video?.nativeElement;

    if (video && video.srcObject !== this.stream) {
      video.srcObject = this.stream;
    }

    void this.playWithMobileFallback();
  }

  private async playWithMobileFallback(): Promise<void> {
    const video = this.video?.nativeElement;

    if (!video) {
      return;
    }

    video.muted = false;

    try {
      await video.play();
      this.audioBlocked.set(false);
    } catch {
      video.muted = true;

      try {
        await video.play();
        this.audioBlocked.set(true);
      } catch {
        this.audioBlocked.set(true);
      }
    }
  }
}
