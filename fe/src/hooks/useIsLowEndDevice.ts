import { useEffect, useState } from "react";

/**
 * Heuristic "is this device too weak to play a background video smoothly?".
 *
 * Signals, most reliable first:
 *   1. navigator.connection.saveData           - user asked for data saver
 *   2. navigator.connection.effectiveType      - slow-2g / 2g
 *   3. navigator.deviceMemory                  - <= 2 GB RAM
 *   4. navigator.hardwareConcurrency           - <= 2 logical cores
 *   5. narrow viewport + coarse pointer (mobile) with no hardware hints
 */

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

type NavigatorWithExtras = Navigator & {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
  deviceMemory?: number;
};

function detectLowEnd(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavigatorWithExtras;
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

  if (connection?.saveData) return true;
  if (connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 2) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2) return true;

  if (typeof window !== "undefined" && window.matchMedia) {
    const narrow = window.matchMedia("(max-width: 640px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (narrow && coarse && !nav.deviceMemory && !nav.hardwareConcurrency) return true;
  }
  return false;
}

export function useIsLowEndDevice(): boolean {
  const [lowEnd, setLowEnd] = useState<boolean>(() => detectLowEnd());

  useEffect(() => {
    const nav = navigator as NavigatorWithExtras;
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    if (!connection?.addEventListener) return;
    const onChange = () => setLowEnd(detectLowEnd());
    connection.addEventListener("change", onChange);
    return () => connection.removeEventListener?.("change", onChange);
  }, []);

  return lowEnd;
}
