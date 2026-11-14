export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = status < 500;
  }
}

export function text(value) {
  return value == null ? '' : String(value).trim();
}

export function maps(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({ ...item }));
}

export function requireText(body, field) {
  if (!text(body?.[field])) throw new ApiError(400, `${field} is required.`);
}
