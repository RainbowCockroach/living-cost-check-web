import { useEffect, useState } from "react";
import { api, ApiError, type Tag, type TxKind } from "../api";
import TagCombobox from "../components/TagCombobox";
import { randomTagColor, readableTextColor } from "../colors";
import { useI18n, type MessageKey } from "../i18n";

// One screen for both directions — a kind toggle decides whether we're logging
// money out (an expense) or money in (income). The tag combobox filters by
// matching tag kind so an "income" tag never appears in the expense flow and
// vice-versa; new tags created inline inherit the current kind.

// Data-driving the toggle keeps the two halves in structural lockstep —
// adding a third kind in future would be a one-line change.
const KINDS: {
  value: TxKind;
  glyph: string;
  labelKey: MessageKey;
  mod: "out" | "in";
}[] = [
  { value: "outflow", glyph: "−", labelKey: "new.kindExpense", mod: "out" },
  { value: "inflow", glyph: "+", labelKey: "new.kindIncome", mod: "in" },
];

const QUICK_PICK_LIMIT = 6;

export default function NewExpenseScreen() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tag, setTag] = useState<Tag | null>(null);
  const [kind, setKind] = useState<TxKind>("outflow");
  const [amount, setAmount] = useState("");
  // Each "+" press pushes the current amount here so multi-item purchases
  // (e.g. a grocery receipt) can be summed inline without a calculator.
  const [parts, setParts] = useState<number[]>([]);
  const [note, setNote] = useState("");
  // Note collapsed until the user opts in — keeps the main flow uncluttered
  // for the common case where the tag is enough context.
  const [noteOpen, setNoteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { t, locale } = useI18n();

  useEffect(() => {
    api
      .listTags()
      .then(setTags)
      .catch((e: ApiError) => setErr(e.message));
  }, []);

  const tagKindForCurrent = kind === "outflow" ? "spending" : "income";
  // Restrict tag options to the matching kind so the combobox can't surface
  // (or auto-create) an income tag in the expense flow, or vice-versa.
  const filteredTags = tags.filter((x) => x.kind === tagKindForCurrent);
  const quickPickTags = filteredTags.slice(0, QUICK_PICK_LIMIT);

  function currentAmount(): number {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  const partsSum = parts.reduce((a, b) => a + b, 0);
  const total = partsSum + currentAmount();

  function switchKind(next: TxKind) {
    if (next === kind) return;
    setKind(next);
    // The previously-selected tag almost certainly belongs to the other kind.
    setTag(null);
    setParts([]);
    setErr(null);
    setMsg(null);
  }

  function addPart() {
    const n = currentAmount();
    if (!n) return;
    setParts((cur) => [...cur, n]);
    setAmount("");
  }

  function removePart(idx: number) {
    setParts((cur) => cur.filter((_, i) => i !== idx));
  }

  async function createTag(name: string): Promise<Tag> {
    const created = await api.createTag(
      name,
      randomTagColor(),
      tagKindForCurrent,
    );
    setTags((cur) => [...cur, created]);
    return created;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!total) {
      setErr(t("new.invalidAmount"));
      return;
    }
    if (!tag) {
      setErr(t("new.pickTag"));
      return;
    }
    setBusy(true);
    try {
      await api.createTransaction({
        amount: total,
        kind,
        tagId: tag.id,
        note: note.trim() || undefined,
      });
      const savedKey: MessageKey =
        kind === "outflow" ? "new.savedTo" : "new.savedIncomeTo";
      setMsg(
        t(savedKey, { amount: total.toLocaleString(locale), tag: tag.name }),
      );
      setAmount("");
      setParts([]);
      setNote("");
      setNoteOpen(false);
      setTag(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("new.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="new-tx">
      <div
        className="kind-segmented"
        role="tablist"
        aria-label={t(kind === "outflow" ? "new.title" : "new.titleIncome")}
      >
        {KINDS.map((k) => {
          const active = kind === k.value;
          return (
            <button
              key={k.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={`kind-segmented__btn kind-segmented__btn--${k.mod} ${active ? "is-active" : ""}`}
              onClick={() => switchKind(k.value)}
            >
              <span className="kind-segmented__glyph" aria-hidden>
                {k.glyph}
              </span>
              {t(k.labelKey)}
            </button>
          );
        })}
      </div>

      <form onSubmit={submit}>
        <div className="field">
          <div className="field__label">{t("new.amount")}</div>
          <div className="amount-row">
            <input
              className="big-input"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              // "+" keypress is a desktop shortcut for the same multi-item
              // flow as the visible + button.
              onKeyDown={(e) => {
                if (e.key === "+") {
                  e.preventDefault();
                  addPart();
                }
              }}
              placeholder="0"
              aria-label={t("new.amount")}
            />
            <button
              type="button"
              className="add-part"
              aria-label={t("new.addPart")}
              onClick={addPart}
              disabled={!currentAmount()}
            >
              +
            </button>
          </div>

          {parts.length > 0 && (
            <div className="parts-row">
              {parts.map((p, i) => {
                const removeLabel = t("new.removePart", {
                  amount: p.toLocaleString(locale),
                });
                return (
                  <button
                    key={i}
                    type="button"
                    className="part-chip"
                    aria-label={removeLabel}
                    title={removeLabel}
                    onClick={() => removePart(i)}
                  >
                    {p.toLocaleString(locale)} ×
                  </button>
                );
              })}
              <span className="parts-total">
                {t("new.partsTotal", { amount: total.toLocaleString(locale) })}
              </span>
            </div>
          )}
        </div>

        <div className="field">
          <div className="field__label">
            {t(kind === "outflow" ? "new.tag" : "new.tagIncome")}
          </div>

          {quickPickTags.length > 0 && (
            <div
              className={`tag-quickpicks ${tag ? "has-selection" : ""}`}
              role="list"
            >
              {quickPickTags.map((qt) => {
                const selected = tag?.id === qt.id;
                const color = qt.color ?? "#dddddd";
                return (
                  <button
                    key={qt.id}
                    type="button"
                    role="listitem"
                    className={`tag-quickpick ${selected ? "is-selected" : ""}`}
                    style={{ background: color, color: readableTextColor(color) }}
                    onClick={() => setTag(selected ? null : qt)}
                    aria-pressed={selected}
                  >
                    {qt.name}
                  </button>
                );
              })}
            </div>
          )}

          <TagCombobox
            tags={filteredTags}
            value={tag}
            onChange={setTag}
            onCreate={createTag}
          />
        </div>

        <div className="field">
          {noteOpen ? (
            <>
              <div className="field__label">{t("new.note")}</div>
              <input
                className="small-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("new.notePlaceholder")}
                autoFocus
              />
            </>
          ) : (
            <button
              type="button"
              className="note-toggle"
              onClick={() => setNoteOpen(true)}
            >
              {t("new.addNote")}
            </button>
          )}
        </div>

        {err && (
          <div className="error" role="alert">
            {err}
          </div>
        )}
        {msg && (
          <div className="success" role="status">
            {msg}
          </div>
        )}

        <button className="save-btn primary" disabled={busy}>
          {busy ? t("new.saving") : t("new.save")}
        </button>
      </form>
    </section>
  );
}
