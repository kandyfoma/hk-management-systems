/**
 * ConnectivityProvider — React Context that wraps ConnectivityService
 * and exposes live network state + helpers to the entire component tree.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  ConnectivityService,
  ConnectivitySnapshot,
  ConnectionQuality,
  ConnectivityEvent,
} from '../services/ConnectivityService';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ConnectivityContextValue {
  /** Current snapshot of network state */
  snapshot: ConnectivitySnapshot;
  /** Shortcut: true when connected */
  isOnline: boolean;
  /** Quality label */
  quality: ConnectionQuality;
  /** Latest measured latency in ms (null if unknown) */
  latencyMs: number | null;
  /** Force re-check connectivity now */
  refresh: () => Promise<void>;
  /** Full event history */
  history: ConnectivitySnapshot[];
  /** Total ms spent offline this session */
  totalOfflineMs: number;
  /** Timestamp of last online→offline transition */
  lastOfflineAt: number | null;
  /** Timestamp of last offline→online transition */
  lastOnlineAt: number | null;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) throw new Error('useConnectivity must be used within ConnectivityProvider');
  return ctx;
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot>(
    ConnectivityService.getSnapshot()
  );
  const [lastOfflineAt, setLastOfflineAt] = useState<number | null>(null);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);

  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      ConnectivityService.start();
      startedRef.current = true;
    }

    const unsub = ConnectivityService.subscribe((event: ConnectivityEvent) => {
      setSnapshot(event.snapshot);
      if (event.type === 'disconnected') {
        setLastOfflineAt(Date.now());
      }
      if (event.type === 'connected') {
        setLastOnlineAt(Date.now());
      }
    });

    // Grab initial snapshot
    ConnectivityService.refreshStatus().then((s) => setSnapshot(s));

    return () => {
      unsub();
    };
  }, []);

  const refresh = useCallback(async () => {
    const s = await ConnectivityService.refreshStatus();
    setSnapshot(s);
  }, []);

  const value: ConnectivityContextValue = {
    snapshot,
    isOnline: snapshot.isConnected,
    quality: snapshot.quality,
    latencyMs: snapshot.latencyMs,
    refresh,
    history: ConnectivityService.getHistory(),
    totalOfflineMs: ConnectivityService.getTotalOfflineMs(),
    lastOfflineAt,
    lastOnlineAt,
  };

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}
