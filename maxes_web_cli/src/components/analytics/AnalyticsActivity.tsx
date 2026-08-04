"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  getStoredActiveSeconds,
  startAnalyticsSession,
  storeActiveSeconds,
  syncActiveNavigationSeconds,
} from "../../lib/analyticsClient";

const SYNC_INTERVAL_MS = 30_000;
const TICK_INTERVAL_MS = 1_000;
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

export default function AnalyticsActivity() {
  const pathname = usePathname();

  useEffect(() => {
    let seconds = getStoredActiveSeconds();
    let lastInteractionAt = Date.now();
    let lastSyncedSeconds = seconds;
    let finished = false;

    const registerInteraction = () => {
      lastInteractionAt = Date.now();
    };
    const sync = () => {
      if (finished) {
        return;
      }
      storeActiveSeconds(seconds);
      if (seconds === lastSyncedSeconds) {
        return;
      }
      lastSyncedSeconds = seconds;
      void syncActiveNavigationSeconds(seconds).catch(() => {
        lastSyncedSeconds = -1;
      });
    };
    const finish = () => {
      finished = true;
    };

    void startAnalyticsSession().catch(() => undefined);

    const tickId = window.setInterval(() => {
      if (
        !finished &&
        document.visibilityState === "visible" &&
        Date.now() - lastInteractionAt < INACTIVITY_LIMIT_MS
      ) {
        seconds += 1;
      }
    }, TICK_INTERVAL_MS);
    const syncId = window.setInterval(sync, SYNC_INTERVAL_MS);

    const interactionEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    interactionEvents.forEach((eventName) =>
      window.addEventListener(eventName, registerInteraction, { passive: true })
    );
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", sync);
    window.addEventListener("maxes:analytics-finished", finish);

    return () => {
      window.clearInterval(tickId);
      window.clearInterval(syncId);
      interactionEvents.forEach((eventName) => window.removeEventListener(eventName, registerInteraction));
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pagehide", sync);
      window.removeEventListener("maxes:analytics-finished", finish);
      sync();
    };
  }, [pathname]);

  return null;
}
