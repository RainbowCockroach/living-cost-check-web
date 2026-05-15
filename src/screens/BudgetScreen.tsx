import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type BudgetView } from '../api';
import { readableTextColor } from '../colors';
import { useI18n } from '../i18n';

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

// YNAB-style monthly grid. Each row is a spending tag; the user assigns money
// inline. `available` carries over from prior months — no client-side math
// here, the server returns the closed-form value.
export default function BudgetScreen() {
  const [period, setPeriod] = useState(currentPeriod());
  const [data, setData] = useState<BudgetView | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Edit buffers per-tagId, keyed so we can show pending input without
  // committing until blur or Enter.
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingTag, setSavingTag] = useState<number | null>(null);
  const { t, locale } = useI18n();

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const view = await api.getBudget(period);
      setData(view);
      setDrafts({});
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('budget.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function commit(tagId: number) {
    const raw = drafts[tagId];
    if (raw === undefined) return;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      setErr(t('budget.invalidAmount'));
      return;
    }
    setSavingTag(tagId);
    setErr(null);
    try {
      await api.setAssignment(period, tagId, n);
      // Reload to pick up the recomputed `available` and tbB. Cheaper than
      // mirroring the server's carryover formula on the client.
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('budget.saveFailed'));
    } finally {
      setSavingTag(null);
    }
  }

  return (
    <section>
      <h2>{t('budget.title')}</h2>

      <div className="filter-row">
        <button onClick={() => setPeriod((p) => shiftPeriod(p, -1))}>
          ← {t('budget.prev')}
        </button>
        <input
          type="month"
          value={period}
          onChange={(e) => e.target.value && setPeriod(e.target.value)}
        />
        <button onClick={() => setPeriod((p) => shiftPeriod(p, 1))}>
          {t('budget.next')} →
        </button>
        <button onClick={() => setPeriod(currentPeriod())}>
          {t('budget.thisMonth')}
        </button>
        <span className="spacer" style={{ flex: 1 }} />
        <button onClick={load} disabled={loading}>
          {loading ? t('expenses.loading') : t('expenses.refresh')}
        </button>
      </div>

      {data && (
        <div
          className="tbb"
          style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0.5rem 0' }}
        >
          {t('budget.toBeBudgeted', {
            amount: data.toBeBudgeted.toLocaleString(locale),
          })}
        </div>
      )}

      {err && <div className="error">{err}</div>}

      {data && data.categories.length === 0 && !loading && (
        <div className="muted">{t('budget.empty')}</div>
      )}

      {data && data.categories.length > 0 && (
        <table className="budget-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{t('budget.col.tag')}</th>
              <th style={{ textAlign: 'right' }}>{t('budget.col.assigned')}</th>
              <th style={{ textAlign: 'right' }}>{t('budget.col.spent')}</th>
              <th style={{ textAlign: 'right' }}>{t('budget.col.available')}</th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((c) => {
              const draft = drafts[c.tag.id];
              const value = draft !== undefined ? draft : String(c.assigned);
              const bg = c.tag.color ?? '#ddd';
              const overspent = c.available < 0;
              return (
                <tr key={c.tag.id}>
                  <td>
                    <span
                      className="tag-chip"
                      style={{ background: bg, color: readableTextColor(bg) }}
                    >
                      {c.tag.name}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={value}
                      disabled={savingTag === c.tag.id}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [c.tag.id]: e.target.value }))
                      }
                      onBlur={() => {
                        if (drafts[c.tag.id] !== undefined &&
                            Number(drafts[c.tag.id]) !== c.assigned) {
                          commit(c.tag.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      style={{ width: '8rem', textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {c.spent.toLocaleString(locale)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      color: overspent ? 'crimson' : undefined,
                      fontWeight: overspent ? 600 : undefined,
                    }}
                  >
                    {c.available.toLocaleString(locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
