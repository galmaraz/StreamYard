const backendPort = '3000';
const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';
const protocol =
  window.location.protocol === 'https:' || !isLocalhost ? 'https:' : 'http:';

export const API_BASE_URL = `${protocol}//${window.location.hostname}:${backendPort}`;
