// Copyright 2026 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Adjusts a collector URL to be reachable from the current platform.
 */
export function adjustCollectorUrlForPlatform(collectorUrl: string, platformOS: string): string {
  const withSchemeAndPort = normalizeCollectorBaseUrl(collectorUrl);

  const normalized = withSchemeAndPort
    .replace('http://0.0.0.0', 'http://127.0.0.1')
    .replace('https://0.0.0.0', 'https://127.0.0.1');

  if (platformOS === 'android') {
    return normalized
      .replace('http://localhost', 'http://10.0.2.2')
      .replace('http://127.0.0.1', 'http://10.0.2.2')
      .replace('https://localhost', 'https://10.0.2.2')
      .replace('https://127.0.0.1', 'https://10.0.2.2');
  }
  return normalized;
}

/**
 * Normalizes collector URL input into an absolute base URL, with default port 8137.
 */
export function normalizeCollectorBaseUrl(input: string, defaultPort: number = 8137): string {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    throw new Error('Collector URL is empty.');
  }

  // Check scheem first - we want to keep the parsing minimal to avoid Hermes URL limitations.
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)(.+)$/.exec(trimmed);
  if (!schemeMatch) {
    throw new Error(`Collector URL must include a scheme (http:// or https://): "${trimmed}"`);
  }

  const scheme = schemeMatch[1];
  let remainder = schemeMatch[2];

  // TODO trim any path/query/fragment, we might not need this to make the parsing simpler.
  const cutIdx = remainder.search(/[/?#]/);
  if (cutIdx >= 0) {
    remainder = remainder.slice(0, cutIdx);
  }

  if (!remainder) {
    throw new Error(`Collector URL is invalid: "${trimmed}"`);
  }

  let hostPort = remainder;
  let hasPort = false;

  // Host or host:port
  const parts = hostPort.split(':');

  if (parts.length === 1) {
    hasPort = false;
  } else if (parts.length === 2) {
    if (!parts[0] || !parts[1]) {
      throw new Error(`Collector URL is invalid: "${trimmed}"`);
    }

    if (!/^\d+$/.test(parts[1])) {
      throw new Error(`Collector URL is invalid: "${trimmed}"`);
    }
    hasPort = true;
  } else {
    throw new Error(`Collector URL is invalid: "${trimmed}"`);
  }

  // Default the port when missing to keep collector URLs short in config.
  if (!hasPort) {
    hostPort = `${hostPort}:${defaultPort}`;
  }

  // This has to be constructed "manually" because of Hermes on iOS. Cordova could use a simpler construction.
  return `${scheme}${hostPort}`;
}

/**
 * Builds a full URL from a collector base URL and a relative path.
 */
export function normalizeUrl(baseUrl: string, path: string): string {
  let b = baseUrl;
  let p = path;

  if (b.endsWith('/')) {
    b = b.slice(0, -1);
  }

  if (!p.startsWith('/')) {
    p = `/${p}`;
  }

  return `${b}${p}`;
}
