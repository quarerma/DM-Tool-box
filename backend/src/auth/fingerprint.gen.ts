import { createHash } from 'crypto';
import type { Request } from 'express';

export interface FingerprintData {
  ua_major: string;
  platform: string;
  language: string;
  device_class: string;
  os_family: string;

  // semi-stable
  accept: string;
  encoding: string;

  // unstable (not included in hash)
  http_version: string;
  user_agent: string;

  // external TLS fingerprint
  ja3: string;
}

export function computeServerFingerprint(req: Request): {
  fingerprint: string;
  data: FingerprintData;
} {
  const h = req.headers;

  const ua = extractUA(h['user-agent']);

  const data: FingerprintData = {
    ua_major: extractMajorUA(ua),
    platform: normalize(h['sec-ch-ua-platform']),
    language: normalize(extractLanguage(h['accept-language'])),
    device_class: detectDeviceClass(ua),
    os_family: detectOSFamily(ua),

    accept: normalize(h['accept']),
    encoding: normalize(h['accept-encoding']),

    http_version: req.httpVersion,
    user_agent: normalize(h['user-agent']),

    ja3: (req as unknown as { ja3?: string }).ja3 || '',
  };

  const raw = [
    data.ua_major,
    data.platform,
    data.device_class,
    data.os_family,
    data.language,
    data.encoding,
    data.accept,
  ].join('|');

  const fingerprint = createHash('sha256').update(raw).digest('hex');

  return { fingerprint, data };
}

function extractUA(ua: string | string[] | undefined): string {
  if (!ua) return '';
  if (Array.isArray(ua)) ua = ua[0];
  return ua.trim().toLowerCase();
}

function normalize(s?: string | string[]): string {
  if (!s) return '';
  if (Array.isArray(s)) s = s[0];
  return s.trim().toLowerCase();
}

function extractLanguage(lang?: string | string[]) {
  if (!lang) return '';
  if (Array.isArray(lang)) lang = lang[0];
  return lang.split(',')[0] || '';
}

function extractMajorUA(ua: string) {
  const match = ua.match(/(chrome|firefox|safari)\/(\d+)/i);
  if (match) return `${match[1].toLowerCase()}/${match[2]}`;
  return ua.split(' ')[0] || '';
}

function detectDeviceClass(ua: string): string {
  if (/mobile|iphone|android/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

function detectOSFamily(ua: string): string {
  if (/windows nt/.test(ua)) return 'windows';
  if (/mac os x/.test(ua)) return 'macos';
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ios/.test(ua)) return 'ios';
  if (/linux/.test(ua)) return 'linux';
  return 'unknown';
}
