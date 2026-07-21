const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';

const API_BASE_URL = (import.meta.env.VITE_ENTERPRISEGPT_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

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
