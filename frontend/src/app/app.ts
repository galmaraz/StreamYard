import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly projectName = 'WebLive2026';

  protected readonly implementationSteps = [
    'Autenticacion y usuarios',
    'Dashboard de salas',
    'Sala de conferencia WebRTC',
    'Chat, grabacion y overlays',
  ];
}
