import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Expense } from '../api';
import { readableTextColor } from '../colors';

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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      // Send the date as start-of-day for `from` and end-of-day for `to` so the
      // filter is inclusive of both endpoints in local time.
      const fromIso = `${from}T00:00:00`;
      const toIso = `${to}T23:59:59`;
      const res = await api.listExpenses({ from: fromIso, to: toIso, limit: 500 });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number) {
    try {
      await api.deleteExpense(id);
      setItems((cur) => cur.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Delete failed.');
    }
  }

  const sum = items.reduce((acc, x) => acc + x.amount, 0);

  return (
    <section>
      <h2>Expenses</h2>
      <div className="filter-row">
        <label style={{ margin: 0 }}>
          <span className="lbl">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label style={{ margin: 0 }}>
          <span className="lbl">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <span className="spacer" style={{ flex: 1 }} />
        <button
          className={editMode ? 'primary' : ''}
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="muted" style={{ marginBottom: '0.5rem' }}>
        {items.length} of {total} • {sum.toLocaleString('vi-VN')} ₫
      </div>

      {err && <div className="error">{err}</div>}

      <ul className="expense-list">
        {items.map((x) => {
          const bg = x.tag.color ?? '#ddd';
          return (
            <li key={x.id}>
              <span className="amount">{x.amount.toLocaleString('vi-VN')} ₫</span>
              <span
                className="tag-chip"
                style={{ background: bg, color: readableTextColor(bg) }}
              >
                {x.tag.name}
              </span>
              <span className="note">{x.note ?? ''}</span>
              <span className="when">
                {new Date(x.occurredAt).toLocaleDateString()}
              </span>
              {editMode && (
                <button className="danger" onClick={() => onDelete(x.id)}>
                  Delete
                </button>
              )}
            </li>
          );
        })}
        {!loading && items.length === 0 && (
          <li className="muted">No expenses in this range.</li>
        )}
      </ul>
    </section>
  );
}
