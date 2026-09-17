import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  DataSourceError,
  FetchFailedError,
  RobotsDisallowedError,
} from "./errors";

const USER_AGENT =
  process.env.DATA_SOURCE_USER_AGENT ??
  "HighSchoolSoccerJapanBot/0.1 (+https://github.com/high-school-soccer-japan; contact: admin@example.com)";

const CACHE_DIR = path.join(process.cwd(), ".cache", "data-sources");
const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;
const MIN_HOST_INTERVAL_MS = 2000;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;

interface CacheEnvelope {
  url: string;
  status: number;
  contentType: string | null;
  fetchedAt: string;
  body: string;
}

const hostLastRequest = new Map<string, number>();
const robotsCache = new Map<string, { allowed: (url: URL) => boolean; fetchedAt: number }>();

function cacheKeyFor(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex");
}

function cachePathFor(url: string): string {
  return path.join(CACHE_DIR, `${cacheKeyFor(url)}.json`);
}

function readCache(url: string, ttlMs: number): CacheEnvelope | null {
  const file = cachePathFor(url);
  try {
    if (!fs.existsSync(file)) return null;
    const envelope = JSON.parse(fs.readFileSync(file, "utf8")) as CacheEnvelope;
    const age = Date.now() - Date.parse(envelope.fetchedAt);
    if (age > ttlMs) return null;
    return envelope;
  } catch {
    return null;
  }
}

function writeCache(envelope: CacheEnvelope): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(
    cachePathFor(envelope.url),
    JSON.stringify(envelope),
    "utf8",
  );
}

async function throttle(host: string): Promise<void> {
  const last = hostLastRequest.get(host) ?? 0;
  const wait = MIN_HOST_INTERVAL_MS - (Date.now() - last);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  hostLastRequest.set(host, Date.now());
}

/**
 * Minimal robots.txt handler. The point is to honour the published rules
 * rather than to implement every extension of the spec.
 */
async function robotsAllows(sourceId: string, url: URL): Promise<boolean> {
  const origin = url.origin;
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000) {
    return cached.allowed(url);
  }

  let body = "";
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) body = await response.text();
  } catch {
    body = "";
  }

  const disallow: string[] = [];
  const allow: string[] = [];
  let applies = false;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      applies = value === "*" || USER_AGENT.toLowerCase().includes(value.toLowerCase());
    } else if (applies && key === "disallow" && value) {
      disallow.push(value);
    } else if (applies && key === "allow" && value) {
      allow.push(value);
    }
  }

  const allowed = (target: URL): boolean => {
    if (disallow.length === 0) return true;
    const matches = (prefix: string) => target.pathname.startsWith(prefix);
    const longestAllow = allow.filter(matches).sort((a, b) => b.length - a.length)[0];
    const longestDisallow = disallow
      .filter(matches)
      .sort((a, b) => b.length - a.length)[0];
    if (!longestDisallow) return true;
    if (longestAllow && longestAllow.length >= longestDisallow.length) return true;
    return false;
  };

  robotsCache.set(origin, { allowed, fetchedAt: Date.now() });
  if (!allowed(url)) {
    throw new RobotsDisallowedError(sourceId, url.toString());
  }
  return true;
}

export interface FetchTextOptions {
  sourceId: string;
  cacheTtlMs?: number;
  /** Skip the on-disk cache. Used by the job runner when it wants fresh data. */
  force?: boolean;
  headers?: Record<string, string>;
}

export interface FetchedDocument {
  url: string;
  status: number;
  contentType: string | null;
  fetchedAt: Date;
  body: string;
  fromCache: boolean;
}

/**
 * Fetches a document as text, honouring robots.txt, throttling per host and
 * persisting a disk cache so that user page views never hit the upstream site.
 */
export async function fetchText(
  url: string,
  options: FetchTextOptions,
): Promise<FetchedDocument> {
  const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  if (!options.force) {
    const cached = readCache(url, ttl);
    if (cached) {
      return {
        url: cached.url,
        status: cached.status,
        contentType: cached.contentType,
        fetchedAt: new Date(cached.fetchedAt),
        body: cached.body,
        fromCache: true,
      };
    }
  }

  const parsed = new URL(url);
  await robotsAllows(options.sourceId, parsed);
  await throttle(parsed.host);

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,application/json,text/csv,application/pdf;q=0.8,*/*;q=0.5",
          "accept-language": "ja,en;q=0.8",
          ...options.headers,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        throw new FetchFailedError(options.sourceId, url, response.status);
      }

      const body = await response.text();
      const envelope: CacheEnvelope = {
        url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        fetchedAt: new Date().toISOString(),
        body,
      };
      writeCache(envelope);

      return {
        url,
        status: response.status,
        contentType: envelope.contentType,
        fetchedAt: new Date(envelope.fetchedAt),
        body,
        fromCache: false,
      };
    } catch (error) {
      lastError = error;
      if (error instanceof RobotsDisallowedError) throw error;
      if (attempt >= MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  if (lastError instanceof FetchFailedError) throw lastError;
  throw new DataSourceError(
    options.sourceId,
    url,
    lastError instanceof Error ? lastError.message : "unknown fetch failure",
    lastError,
  );
}

/**
 * Fetches a binary document (PDF). Cached as base64 so repeated runs do not
 * re-hit the upstream site.
 */
export async function fetchBuffer(
  url: string,
  options: FetchTextOptions,
): Promise<FetchedDocument & { bytes: Buffer }> {
  const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  if (!options.force) {
    const cached = readCache(url, ttl);
    if (cached && cached.body.startsWith("base64:")) {
      return {
        url: cached.url,
        status: cached.status,
        contentType: cached.contentType,
        fetchedAt: new Date(cached.fetchedAt),
        body: "",
        bytes: Buffer.from(cached.body.slice("base64:".length), "base64"),
        fromCache: true,
      };
    }
  }

  const parsed = new URL(url);
  await robotsAllows(options.sourceId, parsed);
  await throttle(parsed.host);

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          accept: "application/pdf,*/*;q=0.8",
          ...options.headers,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        throw new FetchFailedError(options.sourceId, url, response.status);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      const envelope: CacheEnvelope = {
        url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        fetchedAt: new Date().toISOString(),
        body: `base64:${bytes.toString("base64")}`,
      };
      writeCache(envelope);
      return {
        url,
        status: response.status,
        contentType: envelope.contentType,
        fetchedAt: new Date(envelope.fetchedAt),
        body: "",
        bytes,
        fromCache: false,
      };
    } catch (error) {
      lastError = error;
      if (error instanceof RobotsDisallowedError) throw error;
      if (attempt >= MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  if (lastError instanceof FetchFailedError) throw lastError;
  throw new DataSourceError(
    options.sourceId,
    url,
    lastError instanceof Error ? lastError.message : "unknown fetch failure",
    lastError,
  );
}

export function clearFetchCache(): void {
  fs.rmSync(CACHE_DIR, { recursive: true, force: true });
}
