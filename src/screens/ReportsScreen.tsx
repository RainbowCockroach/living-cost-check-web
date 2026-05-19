import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, type Tag } from "../api";
import { readableTextColor } from "../colors";
import RefreshButton from "../components/RefreshButton";
import { useI18n } from "../i18n";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Preset = "thisMonth" | "lastMonth" | "last3Months" | "ytd";

function rangeFor(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === "thisMonth") {
    return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
  }
  if (preset === "lastMonth") {
    return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
  }
  if (preset === "last3Months") {
    return { from: ymd(new Date(y, m - 2, 1)), to: ymd(new Date(y, m + 1, 0)) };
  }
  return { from: ymd(new Date(y, 0, 1)), to: ymd(now) };
}

// Categories below this share of the total get folded into "Other" — keeps the
// chart readable on phones where 20 stacked tiny bars all look the same.
const OTHER_THRESHOLD = 0.02;

type Item = { tag: Tag; sum: number; count: number; percentage: number };

export default function ReportsScreen() {
  const initial = rangeFor("thisMonth");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [activePreset, setActivePreset] = useState<Preset | null>("thisMonth");
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { t, locale } = useI18n();

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.reportByTag({
        from: `${from}T00:00:00`,
        to: `${to}T23:59:59`,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("reports.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    load();
  }, [load]);

  function applyPreset(p: Preset) {
    const r = rangeFor(p);
    setFrom(r.from);
    setTo(r.to);
    setActivePreset(p);
  }

  function onDateChange(setter: (s: string) => void, v: string) {
    setter(v);
    setActivePreset(null);
  }

  // Sort desc, fold the tail into a synthetic "Other" row. Done in render-time
  // memo because both inputs (items, total) come from the same fetch.
  const rows = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.sum - a.sum);
    const big: Item[] = [];
    const small: Item[] = [];
    for (const it of sorted) {
      if (total > 0 && it.sum / total < OTHER_THRESHOLD) small.push(it);
      else big.push(it);
    }
    if (small.length <= 1) return sorted;
    const otherSum = small.reduce((s, x) => s + x.sum, 0);
    const otherCount = small.reduce((s, x) => s + x.count, 0);
    return [
      ...big,
      {
        tag: {
          id: -1,
          name: t("reports.other", { n: small.length }),
          color: null,
          kind: "spending" as const,
        },
        sum: otherSum,
        count: otherCount,
        percentage: total > 0 ? (otherSum / total) * 100 : 0,
      },
    ];
  }, [items, total, t]);

  const maxSum = rows[0]?.sum ?? 0;

  return (
    <section className="reports">
      <div className="date-range">
        <div className="field">
          <div className="field__label">{t("expenses.from")}</div>
          <input
            type="date"
            value={from}
            onChange={(e) => onDateChange(setFrom, e.target.value)}
          />
        </div>
        <div className="field">
          <div className="field__label">{t("expenses.to")}</div>
          <input
            type="date"
            value={to}
            onChange={(e) => onDateChange(setTo, e.target.value)}
          />
        </div>
      </div>

      <div className="report-presets">
        {(["thisMonth", "lastMonth", "last3Months", "ytd"] as Preset[]).map(
          (p) => (
            <button
              key={p}
              className={`report-preset${activePreset === p ? " report-preset--active" : ""}`}
              onClick={() => applyPreset(p)}
            >
              {t(`reports.preset.${p}` as const)}
            </button>
          ),
        )}
        <RefreshButton onClick={load} loading={loading} />
      </div>

      <div className="range-total range-total--out">
        {t("reports.total", { total: total.toLocaleString(locale) })}
      </div>
      <div className="muted reports__summary">
        {t("reports.summary", {
          count: rows.reduce((s, r) => s + r.count, 0),
          from,
          to,
        })}
      </div>

      {err && (
        <div className="error" role="alert">
          {err}
        </div>
      )}

      <ul className="report-bars">
        {rows.map((r) => {
          const color = r.tag.color ?? "var(--border-strong)";
          const widthPct = maxSum > 0 ? (r.sum / maxSum) * 100 : 0;
          const pct = total > 0 ? (r.sum / total) * 100 : 0;
          return (
            <li key={r.tag.id} className="report-bar">
              <div className="report-bar__head">
                <span className="report-bar__name">
                  <span
                    className="tag-chip"
                    style={{ background: color, color: readableTextColor(color) }}
                  >
                    {r.tag.name}
                  </span>
                  <span className="report-bar__count muted">
                    {t("reports.count", { n: r.count })}
                  </span>
                </span>
                <span className="report-bar__sum">
                  {r.sum.toLocaleString(locale)} ₫ ·{" "}
                  <span className="muted">{pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="report-bar__track">
                <div
                  className="report-bar__fill"
                  style={{ width: `${widthPct}%`, background: color }}
                />
              </div>
            </li>
          );
        })}
        {!loading && rows.length === 0 && !err && (
          <li className="muted">{t("reports.empty")}</li>
        )}
      </ul>
    </section>
  );
}
