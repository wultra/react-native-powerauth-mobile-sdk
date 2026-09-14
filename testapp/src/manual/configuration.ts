// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
import Config from 'react-native-config';
import { fetchServerConfiguration } from './serverConfiguration';

export const initialSdkConfiguration = Config.SDK_CONFIG || '';
export const initialEnrollmentUrl = Config.ENROLLMENT_SERVER_URL || Config.ENROLLMENT_URL || '';

export function validateConfiguration(configuration: string, endpoint: string) {
  if (!configuration.trim()) {
    throw new Error('Enter SDK_CONFIG from the PowerAuth application configuration.');
  }
  if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(endpoint.trim())) {
    throw new Error('Enter a valid HTTPS enrollment server URL.');
  }
}

export function loadServerConfiguration(): Promise<string> {
  return fetchServerConfiguration({
    url: Config.POWERAUTH_CLOUD_URL || '',
    applicationId: Config.POWERAUTH_CLOUD_APP_ID || '',
    username: Config.POWERAUTH_CLOUD_USERNAME || '',
    password: Config.POWERAUTH_CLOUD_PASSWORD || '',
  });
}
