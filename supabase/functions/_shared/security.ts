// Shared security helpers for edge functions

export function isValidEmail(email: unknown): boolean {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidString(value: unknown, maxLength = 1000): boolean {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function logAudit(event: string, details: Record<string, unknown> = {}): Promise<void> {
  try {
    console.log(JSON.stringify({ event, ...details, ts: new Date().toISOString() }));
  } catch {
    // logging is best-effort
  }
}

export function safeErrorResponse(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

export { corsHeaders };
