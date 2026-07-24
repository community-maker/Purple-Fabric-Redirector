const LOCAL_API_BASE_URL = 'http://localhost:4000/api/v1';
const PRODUCTION_API_BASE_URL = 'https://purple-fabric-redirector-backend.vercel.app/api/v1';
const configuredApiBaseUrl = import.meta.env.VITE_ENTERPRISEGPT_API_BASE_URL?.trim();

const API_BASE_URL = (
  import.meta.env.DEV
    ? configuredApiBaseUrl || LOCAL_API_BASE_URL
    : configuredApiBaseUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(configuredApiBaseUrl)
      ? configuredApiBaseUrl
      : PRODUCTION_API_BASE_URL
).replace(/\/+$/, '');

async function requestJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON failures still get normalized below.
  }

  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || 'Unable to reach the agent directory API.');
  }

  return body?.data ?? body;
}

export function listAgents() {
  return requestJson('/agents');
}
