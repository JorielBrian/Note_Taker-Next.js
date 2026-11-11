'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { publishSessionEvent, subscribeSessionEvents } from '@/lib/session-sync';

const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

export function SessionActivity() {
  useEffect(() => {
    let lastKeepAliveAt = 0;
    let lastBroadcastAt = 0;

    const keepAliveIfDue = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden' || now - lastKeepAliveAt < KEEP_ALIVE_INTERVAL) return;
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
      // A different tab may be the only tab receiving real user input.
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
