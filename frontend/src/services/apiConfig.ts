const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const configuredPort = import.meta.env.VITE_API_PORT as string | undefined;

function localApiBaseUrl(): string {
  const port = configuredPort ?? "8000";
  return `${window.location.protocol}//${window.location.hostname}:${port}/api/v1`;
}

export function getApiBaseUrl(): string {
  return configuredBaseUrl ?? localApiBaseUrl();
}

export function getApiOrigin(): string {
  return new URL(getApiBaseUrl()).origin;
}
