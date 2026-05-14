import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Expense } from '../api';
import { readableTextColor } from '../colors';
import { useI18n } from '../i18n';

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: ymd(first), to: ymd(last) };
}

export default function ExpensesScreen() {
  const initial = currentMonthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [items, setItems] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  // Sum across the full range from the server, independent of the list's
  // pagination limit so the headline figure is correct even when truncated.
  const [rangeSum, setRangeSum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const { t, locale } = useI18n();

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      // Send the date as start-of-day for `from` and end-of-day for `to` so the
      // filter is inclusive of both endpoints in local time.
      const fromIso = `${from}T00:00:00`;
      const toIso = `${to}T23:59:59`;
      const [res, totals] = await Promise.all([
        api.listExpenses({ from: fromIso, to: toIso, limit: 500 }),
        api.totalExpenses({ from: fromIso, to: toIso }),
      ]);
      setItems(res.items);
      setTotal(res.total);
      setRangeSum(totals.total);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('expenses.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number) {
    try {
      await api.deleteExpense(id);
      const removed = items.find((x) => x.id === id);
      setItems((cur) => cur.filter((x) => x.id !== id));
      setTotal((n) => Math.max(0, n - 1));
      if (removed) setRangeSum((s) => Math.max(0, s - removed.amount));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('expenses.deleteFailed'));
    }
  }


  return (
    <section>
      <h2>{t('expenses.title')}</h2>
      <div className="filter-row">
        <label style={{ margin: 0 }}>
          <span className="lbl">{t('expenses.from')}</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label style={{ margin: 0 }}>
          <span className="lbl">{t('expenses.to')}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button onClick={load} disabled={loading}>
          {loading ? t('expenses.loading') : t('expenses.refresh')}
        </button>
        <span className="spacer" style={{ flex: 1 }} />
        <button
          className={editMode ? 'primary' : ''}
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? t('expenses.done') : t('expenses.edit')}
        </button>
      </div>

      <div className="range-total" style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0.25rem 0' }}>
        {t('expenses.rangeTotal', { total: rangeSum.toLocaleString(locale) })}
      </div>

      <div className="muted" style={{ marginBottom: '0.5rem' }}>
        {t('expenses.summary', {
          shown: items.length,
          total,
          sum: rangeSum.toLocaleString(locale),
        })}
      </div>

      {err && <div className="error">{err}</div>}

      <ul className="expense-list">
        {items.map((x) => {
          const bg = x.tag.color ?? '#ddd';
          return (
            <li key={x.id}>
              <span className="amount">{x.amount.toLocaleString(locale)} ₫</span>
              <span
                className="tag-chip"
                style={{ background: bg, color: readableTextColor(bg) }}
              >
                {x.tag.name}
              </span>
              <span className="note">{x.note ?? ''}</span>
              <span className="when">
                {new Date(x.occurredAt).toLocaleDateString(locale)}
              </span>
              {editMode && (
                <button className="danger" onClick={() => onDelete(x.id)}>
                  {t('expenses.delete')}
                </button>
              )}
            </li>
          );
        })}
        {!loading && items.length === 0 && (
          <li className="muted">{t('expenses.empty')}</li>
        )}
      </ul>
    </section>
  );
}
