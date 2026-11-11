'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { publishSessionEvent, subscribeSessionEvents } from '@/lib/session-sync';

const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
const LAST_KEEP_ALIVE_KEY = 'note-taker:last-keep-alive';
const KEEP_ALIVE_LOCK_KEY = 'note-taker:keep-alive-lock';

function claimKeepAlive(now: number, localLastKeepAliveAt: number): boolean {
  try {
    const lastShared = Number(localStorage.getItem(LAST_KEEP_ALIVE_KEY) ?? 0);
    if (now - Math.max(lastShared, localLastKeepAliveAt) < KEEP_ALIVE_INTERVAL) return false;

    const existingLock = localStorage.getItem(KEEP_ALIVE_LOCK_KEY);
    const lockTime = Number(existingLock?.split(':', 1)[0] ?? 0);
    if (now - lockTime < 10_000) return false;

    const lock = `${now}:${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEEP_ALIVE_LOCK_KEY, lock);
    if (localStorage.getItem(KEEP_ALIVE_LOCK_KEY) !== lock) return false;

    localStorage.setItem(LAST_KEEP_ALIVE_KEY, String(now));
    localStorage.removeItem(KEEP_ALIVE_LOCK_KEY);
    return true;
  } catch {
    // If storage is unavailable, retain a per-tab throttle.
    return now - localLastKeepAliveAt >= KEEP_ALIVE_INTERVAL;
  }
}

export function SessionActivity() {
  useEffect(() => {
    let lastKeepAliveAt = 0;
    let lastBroadcastAt = 0;

    const keepAliveIfDue = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden' || !claimKeepAlive(now, lastKeepAliveAt)) return;
      lastKeepAliveAt = now;
      void api.keepAlive().catch(() => undefined);
    };

    const onActivity = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastBroadcastAt >= 1000) {
        lastBroadcastAt = now;
        publishSessionEvent('activity');
      }
      keepAliveIfDue();
    };

    const unsubscribe = subscribeSessionEvents((event) => {
      if (event.type === 'logout') {
        window.location.assign('/?reason=session-ended');
        return;
      }
      // One tab's activity can trigger the shared, cross-tab keep-alive throttle.
      keepAliveIfDue();
    });

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }
    const onWake = () => {
      if (document.visibilityState === 'visible') keepAliveIfDue();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('pageshow', onWake);

    return () => {
      unsubscribe();
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('pageshow', onWake);
    };
  }, []);

  return null;
}
