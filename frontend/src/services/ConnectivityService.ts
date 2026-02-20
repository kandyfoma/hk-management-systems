/**
 * ConnectivityService — monitors network state, measures latency,
 * tracks connection history, and triggers sync when coming back online.
 *
 * Works on Web, Android & iOS via @react-native-community/netinfo.
 * Falls back gracefully when native APIs are unavailable.
 */

import NetInfo, {
  NetInfoState,
  NetInfoStateType,
} from '@react-native-community/netinfo';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface ConnectivitySnapshot {
  isConnected: boolean;
  type: NetInfoStateType;
  quality: ConnectionQuality;
  latencyMs: number | null;
  downlinkMbps: number | null;
  isInternetReachable: boolean | null;
  timestamp: number;
}

export interface ConnectivityEvent {
  type: 'connected' | 'disconnected' | 'quality-change';
  snapshot: ConnectivitySnapshot;
}

export type ConnectivityListener = (event: ConnectivityEvent) => void;

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PING_TIMEOUT_MS = 8000;
const MAX_HISTORY = 50;

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

class _ConnectivityService {
  private listeners = new Set<ConnectivityListener>();
  private unsubNetInfo: (() => void) | null = null;
  private current: ConnectivitySnapshot = {
    isConnected: true,
    type: NetInfoStateType.unknown,
    quality: 'good',
    latencyMs: null,
    downlinkMbps: null,
    isInternetReachable: null,
    timestamp: Date.now(),
  };
  private history: ConnectivitySnapshot[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastDisconnectedAt: number | null = null;
  private totalOfflineMs = 0;

  // ── lifecycle ────────────────────────────────────────────────

  start() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      NetInfo.configure({
        reachabilityShouldRun: () => false,
      });
    }

    this.unsubNetInfo = NetInfo.addEventListener((state) => {
      this.handleStateChange(state);
    });

    // Periodic latency ping every 30 s
    this.pingInterval = setInterval(() => {
      this.measureLatency();
    }, 30_000);

    // Initial fetch
    NetInfo.fetch().then((state) => this.handleStateChange(state));
    this.measureLatency();
  }

  stop() {
    this.unsubNetInfo?.();
    this.unsubNetInfo = null;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ── public API ───────────────────────────────────────────────

  getSnapshot(): ConnectivitySnapshot {
    return { ...this.current };
  }

  getHistory(): ConnectivitySnapshot[] {
    return [...this.history];
  }

  getTotalOfflineMs(): number {
    let total = this.totalOfflineMs;
    if (this.lastDisconnectedAt) {
      total += Date.now() - this.lastDisconnectedAt;
    }
    return total;
  }

  subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async measureLatency(): Promise<number | null> {
    if (!this.current.isConnected) {
      this.current = {
        ...this.current,
        latencyMs: null,
        quality: 'offline',
        timestamp: Date.now(),
      };
      return null;
    }

    // Browser environments often block external probe URLs and flood the console
    // with ERR_CONNECTION_CLOSED; rely on NetInfo status there instead.
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return this.current.latencyMs;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      const start = Date.now();
      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latency = Date.now() - start;
      this.current = {
        ...this.current,
        latencyMs: latency,
        quality: latencyToQuality(latency),
        timestamp: Date.now(),
      };
      return latency;
    } catch {
      this.current = {
        ...this.current,
        latencyMs: null,
        timestamp: Date.now(),
      };
      return null;
    }
  }

  async refreshStatus(): Promise<ConnectivitySnapshot> {
    const state = await NetInfo.fetch();
    this.handleStateChange(state);
    await this.measureLatency();
    return this.getSnapshot();
  }

  // ── internal ─────────────────────────────────────────────────

  private handleStateChange(state: NetInfoState) {
    const wasConnected = this.current.isConnected;
    const isConnected = state.isConnected ?? false;
    const isInternetReachable = state.isInternetReachable;

    // Downlink from NetInfo details (wifi / cellular)
    let downlinkMbps: number | null = null;
    if (state.details && 'linkSpeed' in state.details) {
      downlinkMbps = (state.details as any).linkSpeed ?? null;
    }

    const snapshot: ConnectivitySnapshot = {
      isConnected,
      type: state.type,
      quality: isConnected ? this.current.quality : 'offline',
      latencyMs: this.current.latencyMs,
      downlinkMbps,
      isInternetReachable,
      timestamp: Date.now(),
    };

    this.current = snapshot;
    this.pushHistory(snapshot);

    // Track offline duration
    if (!isConnected && wasConnected) {
      this.lastDisconnectedAt = Date.now();
      this.emit({ type: 'disconnected', snapshot });
    } else if (isConnected && !wasConnected) {
      if (this.lastDisconnectedAt) {
        this.totalOfflineMs += Date.now() - this.lastDisconnectedAt;
        this.lastDisconnectedAt = null;
      }
      this.emit({ type: 'connected', snapshot });
      // Re-measure latency when coming back online
      this.measureLatency();
    }
  }

  private pushHistory(s: ConnectivitySnapshot) {
    this.history.push(s);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }
  }

  private emit(event: ConnectivityEvent) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.warn('[ConnectivityService] listener error', err);
      }
    });
  }
}

// ── helpers ──────────────────────────────────────────────────

function latencyToQuality(ms: number): ConnectionQuality {
  if (ms <= 100) return 'excellent';
  if (ms <= 250) return 'good';
  if (ms <= 600) return 'fair';
  return 'poor';
}

// ── singleton ────────────────────────────────────────────────

export const ConnectivityService = new _ConnectivityService();
export default ConnectivityService;
