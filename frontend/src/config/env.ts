/**
 * Environment Configuration
 * Centralized access to environment variables
 *
 * Usage:
 *   import { API_BASE_URL, APP_ENV } from '../config/env';
 *   const response = await axios.get(`${API_BASE_URL}/api/v1/endpoint/`);
 */

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
export const APP_ENV = (process.env.REACT_APP_ENV || 'development') as 'development' | 'production' | 'staging';

export const isDevelopment = APP_ENV === 'development';
export const isProduction = APP_ENV === 'production';
export const isStaging = APP_ENV === 'staging';

export const config = {
  apiBaseUrl: API_BASE_URL,
  environment: APP_ENV,
  isDevelopment,
  isProduction,
  isStaging,
} as const;

export default config;
