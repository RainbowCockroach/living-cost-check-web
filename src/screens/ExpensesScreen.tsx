import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Transaction, type TxKind } from '../api';
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
  const [kind, setKind] = useState<TxKind>('outflow');
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  // Sum across the full range. For outflows we use /reports/total (server-
  // side aggregate). For inflows we fall back to summing the page locally —
  // /reports/total is intentionally outflow-only and a separate inflow report
  // would just be cargo cult.
  const [rangeSum, setRangeSum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const { t, locale } = useI18n();

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const fromIso = `${from}T00:00:00`;
      const toIso = `${to}T23:59:59`;
      const res = await api.listTransactions({
        from: fromIso,
        to: toIso,
        kind,
        limit: 500,
      });
      setItems(res.items);
      setTotal(res.total);
      if (kind === 'outflow') {
        const totals = await api.totalOutflows({ from: fromIso, to: toIso });
        setRangeSum(totals.total);
      } else {
        setRangeSum(res.items.reduce((s, x) => s + x.amount, 0));
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('expenses.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [from, to, kind, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number) {
    try {
      await api.deleteTransaction(id);
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

      <div className="kind-toggle" role="tablist" style={{ marginBottom: '0.5rem' }}>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'outflow'}
          className={kind === 'outflow' ? 'primary' : ''}
          onClick={() => setKind('outflow')}
        >
          {t('new.kindExpense')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'inflow'}
          className={kind === 'inflow' ? 'primary' : ''}
          onClick={() => setKind('inflow')}
          style={{ marginLeft: '0.4rem' }}
        >
          {t('new.kindIncome')}
        </button>
      </div>

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
          const sign = kind === 'inflow' ? '+' : '';
          return (
            <li key={x.id}>
              <span className="amount">
                {sign}
                {x.amount.toLocaleString(locale)} ₫
              </span>
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
