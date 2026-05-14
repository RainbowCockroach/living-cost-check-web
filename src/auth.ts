const KEY = 'living-cost-check.apiKey';

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
