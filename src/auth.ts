const KEY = 'living-cost-check.apiKey';
const BREADCRUMB = 'living-cost-check.lastAuthError';

export function getApiKey(): string {
  return localStorage.getItem(KEY) ?? '';
}

export function setApiKey(value: string): void {
  if (value) localStorage.setItem(KEY, value);
  else localStorage.removeItem(KEY);
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY);
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export type AuthBreadcrumb = {
  status: number;
  path: string;
  at: string;
};

export function recordAuthError(status: number, path: string): void {
  try {
    const crumb: AuthBreadcrumb = {
      status,
      path,
      at: new Date().toISOString(),
    };
    localStorage.setItem(BREADCRUMB, JSON.stringify(crumb));
  } catch {
    /* localStorage may be unavailable in some Android browser modes */
  }
}

export function readAuthBreadcrumb(): AuthBreadcrumb | null {
  try {
    const raw = localStorage.getItem(BREADCRUMB);
    if (!raw) return null;
    return JSON.parse(raw) as AuthBreadcrumb;
  } catch {
    return null;
  }
}

export function clearAuthBreadcrumb(): void {
  localStorage.removeItem(BREADCRUMB);
}
