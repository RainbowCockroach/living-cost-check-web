import { API_BASE_URL } from './config';
import { getApiKey, recordAuthError } from './auth';

export type TxKind = 'outflow' | 'inflow';
export type TagKind = 'spending' | 'income';
export type TargetKind = 'by_date' | 'monthly_refill' | 'monthly_contribution';

export type Tag = {
  id: number;
  name: string;
  color: string | null;
  kind: TagKind;
};

export type Transaction = {
  id: number;
  amount: number;
  kind: TxKind;
  note: string | null;
  occurredAt: string;
  tagId: number;
  tag: Tag;
  createdById: number | null;
};

export type BudgetTarget = {
  id: number;
  tagId: number;
  kind: TargetKind;
  amount: number;
  dueMonth: string | null;
  note: string | null;
  tag: Tag;
};

export type BudgetCategory = {
  tag: Tag;
  assigned: number;
  spent: number;
  available: number;
  target: BudgetTarget | null;
  needed: number;
};

export type BudgetView = {
  period: string;
  toBeBudgeted: number;
  categories: BudgetCategory[];
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
    // Don't clear the stored key — a transient 401 (Cloudflare Tunnel hiccup,
    // captive portal, etc.) would otherwise log the user out and leave bookmarks
    // landing on the key screen forever. The key is overwritten when the user
    // re-enters one on /key, which is enough. We do leave a breadcrumb so the
    // key screen can show why we ended up there if the user navigates over.
    recordAuthError(401, path);
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
  me: () => request<{ id: number; name: string }>('GET', '/me'),

  listTags: () => request<Tag[]>('GET', '/tags'),
  createTag: (name: string, color?: string, kind: TagKind = 'spending') =>
    request<Tag>('POST', '/tags', { name, color, kind }),
  updateTag: (
    id: number,
    patch: { name?: string; color?: string | null; kind?: TagKind },
  ) => request<Tag>('PATCH', `/tags/${id}`, patch),
  deleteTag: (id: number) => request<void>('DELETE', `/tags/${id}`),

  listTransactions: (params: {
    from?: string;
    to?: string;
    kind?: TxKind;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.kind) q.set('kind', params.kind);
    if (params.limit) q.set('limit', String(params.limit));
    return request<{ total: number; items: Transaction[] }>(
      'GET',
      `/transactions?${q.toString()}`,
    );
  },
  createTransaction: (data: {
    amount: number;
    kind: TxKind;
    tagId: number;
    note?: string;
    occurredAt?: string;
  }) => request<Transaction>('POST', '/transactions', data),
  deleteTransaction: (id: number) =>
    request<void>('DELETE', `/transactions/${id}`),

  // Sum + count for a date range, server-side. Outflow only — matches the
  // semantics of /reports/by-tag, which the budget UI also leans on.
  totalOutflows: (params: { from?: string; to?: string }) => {
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

  getBudget: (period: string) =>
    request<BudgetView>('GET', `/budget/${period}`),
  setAssignment: (period: string, tagId: number, amount: number, note?: string) =>
    request<{ id: number; period: string; tagId: number; amount: number }>(
      'PUT',
      `/budget/${period}/assignments/${tagId}`,
      { amount, note },
    ),
  deleteAssignment: (period: string, tagId: number) =>
    request<void>('DELETE', `/budget/${period}/assignments/${tagId}`),

  listTargets: () => request<BudgetTarget[]>('GET', '/targets'),
  upsertTarget: (data: {
    tagId: number;
    kind: TargetKind;
    amount: number;
    dueMonth?: string | null;
    note?: string | null;
  }) => request<BudgetTarget>('PUT', '/targets', data),
  deleteTarget: (id: number) => request<void>('DELETE', `/targets/${id}`),
};
