// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
import { Buffer } from 'buffer';

export interface ConfigurationServer {
  url: string;
  applicationId: string;
  username: string;
  password: string;
}

/** Same application-detail endpoint as IntegrationHelper.getApplicationDetail(). */
export async function fetchServerConfiguration(server: ConfigurationServer): Promise<string> {
  if (!server.url || !server.applicationId || !server.username || !server.password) {
    throw new Error(
      'Set POWERAUTH_CLOUD_URL, POWERAUTH_CLOUD_APP_ID, POWERAUTH_CLOUD_USERNAME and POWERAUTH_CLOUD_PASSWORD in .env, then rebuild the app.',
    );
  }
  if (!/^https:\/\/[^\s/?#]+(?:\/[^\s?#]*)?$/.test(server.url)) {
    throw new Error('POWERAUTH_CLOUD_URL must be an HTTPS URL without a query or fragment.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(
      `${server.url.replace(/\/+$/, '')}/admin/applications/${encodeURIComponent(server.applicationId)}`,
      {
        method: 'GET',
        headers: {
          authorization: `Basic ${Buffer.from(`${server.username}:${server.password}`, 'utf8').toString('base64')}`,
          accept: 'application/json',
        },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      throw new Error(`Application configuration request failed (HTTP ${response.status}).`);
    }
    const application = await response.json();
    if (typeof application?.mobileSdkConfig !== 'string' || !application.mobileSdkConfig.trim()) {
      throw new Error('Application detail is missing mobileSdkConfig.');
    }
    return application.mobileSdkConfig;
  } finally {
    clearTimeout(timeout);
  }
}
