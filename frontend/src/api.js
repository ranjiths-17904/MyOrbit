export function apiBase() {
  return (localStorage.getItem('myorbit-api-base') || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

export function setApiBase(url) {
  localStorage.setItem('myorbit-api-base', (url || '').replace(/\/$/, ''));
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}
