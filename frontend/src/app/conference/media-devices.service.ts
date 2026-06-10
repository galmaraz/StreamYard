import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MediaDevicesService {
  private stream: MediaStream | null = null;
  private cameraStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  readonly localStream = signal<MediaStream | null>(null);
  readonly mediaReady = signal(false);
  readonly mediaError = signal<string | null>(null);
  readonly screenSharing = signal(false);
  readonly screenShareVersion = signal(0);

  async startLocalMedia(): Promise<MediaStream> {
    if (this.stream) {
      return this.stream;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.mediaError.set('Este navegador no soporta captura de camara/microfono.');
      throw new Error('getUserMedia not supported');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      this.cameraStream = this.stream;
      this.localStream.set(this.stream);
      this.mediaReady.set(true);
      this.mediaError.set(null);

      return this.stream;
    } catch (error) {
      this.mediaReady.set(false);
      this.mediaError.set('No se pudo acceder a camara o microfono.');
      throw error;
    }
  }

  async startScreenShare(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.mediaError.set('Este navegador no soporta compartir pantalla.');
      throw new Error('getDisplayMedia not supported');
    }

    if (!this.cameraStream) {
      await this.startLocalMedia();
    }

    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });

    const [screenTrack] = this.screenStream.getVideoTracks();

    screenTrack.onended = () => {
      this.stopScreenShare();
    };

    const audioTracks = this.cameraStream?.getAudioTracks() ?? [];
    this.stream = new MediaStream([screenTrack, ...audioTracks]);
    this.localStream.set(this.stream);
    this.mediaReady.set(true);
    this.screenSharing.set(true);

    return this.stream;
  }

  stopScreenShare(): MediaStream | null {
    this.screenStream?.getTracks().forEach((track) => track.stop());
    this.screenStream = null;
    this.screenSharing.set(false);
    this.screenShareVersion.update((version) => version + 1);

    if (this.cameraStream) {
      this.stream = this.cameraStream;
      this.localStream.set(this.cameraStream);
      this.mediaReady.set(true);

      return this.cameraStream;
    }

    this.stream = null;
    this.localStream.set(null);
    this.mediaReady.set(false);

    return null;
  }

  setMicEnabled(enabled: boolean): void {
    this.cameraStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  setCameraEnabled(enabled: boolean): void {
    this.cameraStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });

    if (!this.screenSharing()) {
      this.stream?.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  stopLocalMedia(): void {
    this.screenStream?.getTracks().forEach((track) => track.stop());
    this.screenStream = null;
    this.screenSharing.set(false);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.cameraStream = null;
    this.localStream.set(null);
    this.mediaReady.set(false);
  }
}
