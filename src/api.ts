import { API_BASE_URL } from './config';
import { clearApiKey, getApiKey } from './auth';

export type Tag = { id: number; name: string; color: string | null };
export type Expense = {
  id: number;
  amount: number;
  note: string | null;
  occurredAt: string;
  tagId: number;
  tag: Tag;
  createdById: number | null;
  templateId: number | null;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const key = getApiKey();
  const hasBody = body !== undefined;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      // Fastify rejects an empty body when Content-Type is application/json,
      // so only declare the content type when we actually send one.
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(key ? { 'X-API-Key': key } : {}),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearApiKey();
    // Force the app back to the key-entry screen.
    if (location.hash !== '#/key') location.hash = '#/key';
    throw new ApiError(401, 'Invalid API key');
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // Used by the key-entry screen to validate before saving.
  me: () => request<{ id: number; name: string }>('GET', '/me'),

  listTags: () => request<Tag[]>('GET', '/tags'),
  createTag: (name: string, color?: string) =>
    request<Tag>('POST', '/tags', { name, color }),

  listExpenses: (params: { from?: string; to?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.limit) q.set('limit', String(params.limit));
    return request<{ total: number; items: Expense[] }>(
      'GET',
      `/expenses?${q.toString()}`,
    );
  },
  createExpense: (data: { amount: number; tagId: number; note?: string }) =>
    request<Expense>('POST', '/expenses', data),
  deleteExpense: (id: number) =>
    request<void>('DELETE', `/expenses/${id}`),

  // Headline total for a date range — sum of `amount` and count of expenses.
  // The list endpoint's `total` is a row count, so we use this when the UI
  // needs the actual sum across the full range (not just the loaded page).
  totalExpenses: (params: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    return request<{
      from: string | null;
      to: string | null;
      total: number;
      count: number;
    }>('GET', `/reports/total?${q.toString()}`);
  },
};
