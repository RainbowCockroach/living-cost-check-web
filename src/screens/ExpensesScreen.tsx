import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Transaction, type TxKind } from "../api";
import { readableTextColor } from "../colors";
import KindSegmented from "../components/KindSegmented";
import RefreshButton from "../components/RefreshButton";
import { useI18n } from "../i18n";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
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
  const [kind, setKind] = useState<TxKind>("outflow");
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [saving, setSaving] = useState(false);
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
      if (kind === "outflow") {
        const totals = await api.totalOutflows({ from: fromIso, to: toIso });
        setRangeSum(totals.total);
      } else {
        setRangeSum(res.items.reduce((s, x) => s + x.amount, 0));
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("expenses.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [from, to, kind, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Leaving edit mode collapses any open editor.
  useEffect(() => {
    if (!editMode) {
      setEditingId(null);
      setEditAmount("");
    }
  }, [editMode]);

  function startEdit(tx: Transaction) {
    setEditingId(tx.id);
    setEditAmount(String(tx.amount));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAmount("");
  }

  async function saveEdit(id: number) {
    const next = Math.round(Number(editAmount));
    const prev = items.find((x) => x.id === id);
    if (!prev || !Number.isFinite(next) || next <= 0) {
      cancelEdit();
      return;
    }
    if (next === prev.amount) {
      cancelEdit();
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const updated = await api.updateTransaction(id, { amount: next });
      setItems((cur) => cur.map((x) => (x.id === id ? updated : x)));
      const delta = updated.amount - prev.amount;
      setRangeSum((s) => Math.max(0, s + delta));
      cancelEdit();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("expenses.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    try {
      await api.deleteTransaction(id);
      const removed = items.find((x) => x.id === id);
      setItems((cur) => cur.filter((x) => x.id !== id));
      setTotal((n) => Math.max(0, n - 1));
      if (removed) setRangeSum((s) => Math.max(0, s - removed.amount));
      if (editingId === id) cancelEdit();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("expenses.deleteFailed"));
    }
  }

  return (
    <section className="expenses">
      <KindSegmented
        value={kind}
        onChange={setKind}
        ariaLabel={t("expenses.title")}
      />

      <div className="date-range">
        <div className="field">
          <div className="field__label">{t("expenses.from")}</div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="field">
          <div className="field__label">{t("expenses.to")}</div>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="expenses__actions">
        <RefreshButton onClick={load} loading={loading} />
        <button
          className={editMode ? "primary" : ""}
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? t("expenses.done") : t("expenses.edit")}
        </button>
      </div>

      <div
        className={`range-total range-total--${kind === "inflow" ? "in" : "out"}`}
      >
        {t("expenses.rangeTotal", { total: rangeSum.toLocaleString(locale) })}
      </div>
      <div className="muted expenses__summary">
        {t("expenses.summary", {
          shown: items.length,
          total,
          sum: rangeSum.toLocaleString(locale),
        })}
      </div>

      {err && (
        <div className="error" role="alert">
          {err}
        </div>
      )}

      <ul className={`expense-list${editMode ? " expense-list--editing" : ""}`}>
        {items.map((x) => {
          const bg = x.tag.color ?? "#ddd";
          const sign = kind === "inflow" ? "+" : "";
          const isEditing = editingId === x.id;
          return (
            <li key={x.id} className={isEditing ? "is-editing" : undefined}>
              <button
                type="button"
                className="expense-row"
                disabled={!editMode}
                onClick={() => {
                  if (!editMode) return;
                  if (isEditing) cancelEdit();
                  else startEdit(x);
                }}
              >
                <span
                  className={`amount amount--${kind === "inflow" ? "in" : "out"}`}
                >
                  {sign}
                  {x.amount.toLocaleString(locale)} ₫
                </span>
                <span
                  className="tag-chip"
                  style={{ background: bg, color: readableTextColor(bg) }}
                >
                  {x.tag.name}
                </span>
                <span className="when">
                  {new Date(x.occurredAt).toLocaleDateString(locale)}
                </span>
                {x.note && <span className="note">{x.note}</span>}
              </button>

              {isEditing && (
                <div className="expense-edit">
                  <label className="field expense-edit__amount">
                    <div className="field__label">
                      {t("expenses.amount")}
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      autoFocus
                    />
                  </label>
                  <div className="expense-edit__actions">
                    <button
                      className="danger"
                      onClick={() => onDelete(x.id)}
                      disabled={saving}
                    >
                      {t("expenses.delete")}
                    </button>
                    <span className="spacer" />
                    <button onClick={cancelEdit} disabled={saving}>
                      {t("expenses.cancel")}
                    </button>
                    <button
                      className="primary"
                      onClick={() => saveEdit(x.id)}
                      disabled={saving}
                    >
                      {t("expenses.save")}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {!loading && items.length === 0 && (
          <li className="muted">{t("expenses.empty")}</li>
        )}
      </ul>
    </section>
  );
}
