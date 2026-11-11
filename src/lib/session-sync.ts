export type SessionEventType = 'activity' | 'logout';

type SessionEvent = { type: SessionEventType; at: number; nonce?: string };

const CHANNEL_NAME = 'note-taker-session';
const STORAGE_KEY = 'note-taker-session-event';

export function publishSessionEvent(type: SessionEventType) {
  if (typeof window === 'undefined') return;
  const event: SessionEvent = { type, at: Date.now(), nonce: Math.random().toString(36).slice(2) };

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  } catch {
    // Storage events below are the fallback for browsers without BroadcastChannel.
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

export function subscribeSessionEvents(handler: (event: SessionEvent) => void) {
  if (typeof window === 'undefined') return () => undefined;

  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (message: MessageEvent<SessionEvent>) => {
      if (message.data?.type === 'activity' || message.data?.type === 'logout') handler(message.data);
    });
  } catch {
    channel = undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const value = JSON.parse(event.newValue) as SessionEvent;
      if (value.type === 'activity' || value.type === 'logout') handler(value);
    } catch {
      // Ignore malformed cross-tab messages.
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    channel?.close();
    window.removeEventListener('storage', onStorage);
  };
}
