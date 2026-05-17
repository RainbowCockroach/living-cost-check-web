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
//
// Layout is a card list (one per tag) rather than a table so the screen reads
// well at phone widths. On wider viewports the four metric cells line up in a
// single row; on mobile they wrap into a 2x2 grid.
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

  // Top-up semantics: server's `needed` is the *additional* amount required
  // this month, so the new total is current + needed. Matches YNAB's
  // Auto-Assign (never decreases an existing assignment).
  async function assignNeeded(tagId: number, needed: number, currentAssigned: number) {
    setSavingTag(tagId);
    setErr(null);
    try {
      await api.setAssignment(period, tagId, currentAssigned + needed);
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

      <div className="budget-controls">
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
        <button
          onClick={load}
          disabled={loading}
          className="budget-controls__refresh"
        >
          {loading ? t('expenses.loading') : t('expenses.refresh')}
        </button>
      </div>

      {data && (
        <div className="tbb">
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
        <ul className="budget-list">
          {data.categories.map((c) => {
            const draft = drafts[c.tag.id];
            const value = draft !== undefined ? draft : String(c.assigned);
            const bg = c.tag.color ?? '#ddd';
            const overspent = c.available < 0;
            const isSaving = savingTag === c.tag.id;
            const showAssignBtn = c.needed > 0;
            return (
              <li key={c.tag.id} className="budget-row">
                <div className="budget-row__head">
                  <span
                    className="tag-chip"
                    style={{ background: bg, color: readableTextColor(bg) }}
                  >
                    {c.tag.name}
                  </span>
                </div>

                <div className="budget-row__cells">
                  <div className="budget-cell">
                    <div className="budget-cell__label">
                      {t('budget.col.assigned')}
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={value}
                      disabled={isSaving}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [c.tag.id]: e.target.value }))
                      }
                      onBlur={() => {
                        if (
                          drafts[c.tag.id] !== undefined &&
                          Number(drafts[c.tag.id]) !== c.assigned
                        ) {
                          commit(c.tag.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="budget-cell__input"
                    />
                  </div>

                  <div className="budget-cell">
                    <div className="budget-cell__label">
                      {t('budget.col.needed')}
                    </div>
                    <div className="budget-cell__value">
                      {c.needed > 0 ? (
                        c.needed.toLocaleString(locale)
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </div>
                    {showAssignBtn && (
                      <button
                        onClick={() => assignNeeded(c.tag.id, c.needed, c.assigned)}
                        disabled={isSaving}
                        className="budget-cell__action"
                      >
                        {t('budget.assignNeeded', {
                          amount: c.needed.toLocaleString(locale),
                        })}
                      </button>
                    )}
                  </div>

                  <div className="budget-cell">
                    <div className="budget-cell__label">
                      {t('budget.col.spent')}
                    </div>
                    <div className="budget-cell__value">
                      {c.spent.toLocaleString(locale)}
                    </div>
                  </div>

                  <div className="budget-cell">
                    <div className="budget-cell__label">
                      {t('budget.col.available')}
                    </div>
                    <div
                      className={
                        'budget-cell__value' +
                        (overspent ? ' budget-cell__value--neg' : '')
                      }
                    >
                      {c.available.toLocaleString(locale)}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
