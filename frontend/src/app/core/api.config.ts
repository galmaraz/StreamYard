const backendPort = '3000';
const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';

export const API_BASE_URL = `${protocol}//${window.location.hostname}:${backendPort}`;
