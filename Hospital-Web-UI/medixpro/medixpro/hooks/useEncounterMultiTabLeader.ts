"use client";

import { useEffect, useRef, useState } from "react";

const CHANNEL_NAME = "encounter_channel";

export type EncounterChannelMessage = {
  type: "OPEN" | "CLOSE";
  encounterId: string;
  tabId: string;
};

function newTabId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tab-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function openChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

function computeIsSecondaryTab(myTabId: string, peerIds: Set<string>): boolean {
  if (peerIds.size === 0) return false;
  const all = [myTabId, ...peerIds];
  const leader = all.slice().sort()[0];
  return leader !== myTabId;
}

/**
 * Coordinates multiple browser tabs on the same clinical encounter via BroadcastChannel.
 * Lexicographically smallest tabId among this tab and peers is the "leader" that may perform
 * mutating actions; other tabs get isSecondaryTab true (banner / block writes).
 */
export function useEncounterMultiTabLeader(encounterId: string | null | undefined) {
  const tabIdRef = useRef<string>("");
  const peerIdsRef = useRef<Set<string>>(new Set());
  const [isSecondaryTab, setIsSecondaryTab] = useState(false);

  useEffect(() => {
    if (!encounterId) {
      peerIdsRef.current.clear();
      setIsSecondaryTab(false);
      return;
    }

    if (!tabIdRef.current) {
      tabIdRef.current = newTabId();
    }

    const channel = openChannel();
    const myTabId = tabIdRef.current;

    const recompute = () => {
      setIsSecondaryTab(computeIsSecondaryTab(myTabId, peerIdsRef.current));
    };

    const post = (type: "OPEN" | "CLOSE") => {
      if (!channel) return;
      const payload: EncounterChannelMessage = { type, encounterId, tabId: myTabId };
      channel.postMessage(payload);
    };

    const onMessage = (event: MessageEvent<EncounterChannelMessage>) => {
      const data = event.data;
      if (!data || data.encounterId !== encounterId || typeof data.tabId !== "string") return;
      if (data.tabId === myTabId) return;

      if (data.type === "OPEN") {
        peerIdsRef.current.add(data.tabId);
        recompute();
      } else if (data.type === "CLOSE") {
        peerIdsRef.current.delete(data.tabId);
        recompute();
      }
    };

    if (channel) {
      channel.addEventListener("message", onMessage as EventListener);
    }

    post("OPEN");
    recompute();

    const notifyClose = () => post("CLOSE");

    window.addEventListener("beforeunload", notifyClose);
    window.addEventListener("pagehide", notifyClose);

    return () => {
      window.removeEventListener("beforeunload", notifyClose);
      window.removeEventListener("pagehide", notifyClose);
      notifyClose();
      peerIdsRef.current.clear();
      setIsSecondaryTab(false);
      if (channel) {
        channel.removeEventListener("message", onMessage as EventListener);
        channel.close();
      }
    };
  }, [encounterId]);

  return { isSecondaryTab, tabId: tabIdRef.current };
}
