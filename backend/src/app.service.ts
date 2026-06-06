import { Injectable } from '@nestjs/common';

type HealthResponse = {
  status: 'ok';
  service: string;
  timestamp: string;
};

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'weblive2026-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
