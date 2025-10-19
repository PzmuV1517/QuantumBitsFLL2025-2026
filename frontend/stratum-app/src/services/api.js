import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config/config';

// Helper to resolve the most appropriate base URL at runtime
const resolveBaseUrl = async () => {
  try {
    const override = await AsyncStorage.getItem('apiBaseUrlOverride');
    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
    let base = override || (isWeb ? `${window.location.origin}/api` : config.apiBaseUrl);

    // Prevent mixed content on HTTPS pages by upgrading scheme when pointing to same host
    if (isWeb && window.location.protocol === 'https:' && base.startsWith('http://')) {
      try {
        const target = new URL(base);
        const current = new URL(window.location.href);
        if (target.host === current.host) {
          base = base.replace('http://', 'https://');
        }
      } catch {
        // If URL parsing fails, leave base as-is
      }
    }
    return base;
  } catch {
    return config.apiBaseUrl;
  }
};

const api = axios.create({
  // This initial value will be corrected by the interceptor very early
  baseURL: config.apiBaseUrl,
  timeout: 10000,
});

// Initialize baseURL from saved override ASAP (best-effort, may race with first requests)
(async () => {
  const base = await resolveBaseUrl();
  api.defaults.baseURL = base;
})();

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Ensure baseURL honors override and production defaults on every request
    const base = await resolveBaseUrl();
    config.baseURL = base;

    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Only set JSON Content-Type when body is a plain object (not FormData)
    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (!isFormData) {
      config.headers = config.headers || {};
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    } else {
      // Ensure any previously set JSON header is removed so browser/runtime can inject multipart boundary
      if (config.headers && config.headers['Content-Type'] === 'application/json') {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage and redirect to login
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

export default api;
