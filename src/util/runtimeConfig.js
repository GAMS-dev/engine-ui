const runtimeConfig = window.__RUNTIME_CONFIG__ ?? {};

export function getEngineUrl() {
  return runtimeConfig.ENGINE_URL || import.meta.env.VITE_ENGINE_URL || '/api';
}

export function getBaseUrl() {
  return runtimeConfig.BASE_URL || '/';
}
