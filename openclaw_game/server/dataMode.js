import fs from 'fs';
import os from 'os';
import path from 'path';

const DEFAULT_OPENCLAW_HOME = path.join(os.homedir(), '.openclaw');
const DEFAULT_ROOM_ID = 'room-42';

function sanitizeMode(value) {
  const mode = String(value || 'auto').toLowerCase();
  return ['auto', 'demo', 'live'].includes(mode) ? mode : 'auto';
}

export function getOpenclawHome() {
  return process.env.OPENCLAWD_OPENCLAW_HOME || DEFAULT_OPENCLAW_HOME;
}

export function getConfiguredMode() {
  return sanitizeMode(process.env.OPENCLAWD_DATA_MODE);
}

export function hasLiveOpenclawData() {
  const openclawHome = getOpenclawHome();
  const configPath = path.join(openclawHome, 'openclaw.json');
  return fs.existsSync(openclawHome) && fs.existsSync(configPath);
}

export function getResolvedDataMode() {
  const configured = getConfiguredMode();
  if (configured === 'demo' || configured === 'live') {
    return configured;
  }
  return hasLiveOpenclawData() ? 'live' : 'demo';
}

export function getRoomId() {
  return process.env.OPENCLAWD_SYSTEM_ROOM || DEFAULT_ROOM_ID;
}

export function getAdminToken() {
  return process.env.OPENCLAWD_ADMIN_TOKEN || 'admin-demo-token';
}

export function getReadonlyToken() {
  return process.env.OPENCLAWD_READONLY_TOKEN || 'readonly-demo-token';
}

export function getRuntimeBootstrap() {
  const openclawHome = getOpenclawHome();
  const mode = getResolvedDataMode();
  const liveDetected = hasLiveOpenclawData();

  return {
    mode,
    configuredMode: getConfiguredMode(),
    liveDetected,
    openclawHome,
    roomId: getRoomId(),
    tokens: {
      admin: getAdminToken(),
      readonly: getReadonlyToken(),
    },
  };
}
