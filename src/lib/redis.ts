// ─── In-memory Cache & Rate Limiting ────────────────────────────
// Replaces Upstash Redis + Ratelimit for a fully local setup

const store = new Map<string, { value: string; expiresAt: number }>();

function setex(key: string, ttlSeconds: number, value: string) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function get(key: string): string | null {
  const item = store.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    store.delete(key);
    return null;
  }
  return item.value;
}

function del(key: string) {
  store.delete(key);
}

// Simple sliding window rate limiter
class LocalRateLimit {
  private windows = new Map<string, number[]>();
  
  constructor(private maxRequests: number, private windowMs: number) {}

  async limit(identifier: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const timestamps = this.windows.get(identifier) || [];
    
    // Filter timestamps within the current window
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
    
    if (validTimestamps.length >= this.maxRequests) {
      this.windows.set(identifier, validTimestamps);
      return { success: false };
    }
    
    validTimestamps.push(now);
    this.windows.set(identifier, validTimestamps);
    return { success: true };
  }
}

// ─── Rate limiters ───────────────────────────────────────────
// 20 chat messages per user per minute
export const chatRateLimit = new LocalRateLimit(20, 60 * 1000);

// 5 login attempts per IP per 15 minutes
export const loginRateLimit = new LocalRateLimit(5, 15 * 60 * 1000);

// ─── Session cache ───────────────────────────────────────────
export async function cacheSession(sessionId: string, data: object): Promise<void> {
  setex(`session:${sessionId}`, 3600, JSON.stringify(data));
}

export async function getCachedSession(sessionId: string): Promise<object | null> {
  const raw = get(`session:${sessionId}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function invalidateSession(sessionId: string): Promise<void> {
  del(`session:${sessionId}`);
}

// ─── Crisis flags ─────────────────────────────────────────────
export async function flagCrisisSession(sessionId: string): Promise<void> {
  setex(`crisis:${sessionId}`, 86400, '1');
}

export async function isSessionFlagged(sessionId: string): Promise<boolean> {
  return get(`crisis:${sessionId}`) === '1';
}
