import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, type Tag, type TxKind } from '../api';
import TagCombobox from '../components/TagCombobox';
import { randomTagColor, readableTextColor } from '../colors';
import { useI18n } from '../i18n';

// One screen for both directions — a kind toggle decides whether we're logging
// money out (an expense) or money in (income). The tag combobox filters by
// matching tag kind so an "income" tag never appears in the expense flow and
// vice-versa; new tags created inline inherit the current kind.
export default function NewExpenseScreen() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tag, setTag] = useState<Tag | null>(null);
  const [kind, setKind] = useState<TxKind>('outflow');
  const [amount, setAmount] = useState('');
  // Each "+" press pushes the current amount here so multi-item purchases
  // (e.g. grocery receipt) can be summed inline without an external calculator.
  const [parts, setParts] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { t, locale } = useI18n();

  function reloadTags() {
    return api
      .listTags()
      .then(setTags)
      .catch((e: ApiError) => setErr(e.message));
  }

  useEffect(() => {
    reloadTags();
  }, []);

  const tagKindForCurrent = kind === 'outflow' ? 'spending' : 'income';

  // Slice the tag list to the kind that matches the current direction so the
  // combobox can't surface (or auto-create) the wrong sort.
  const filteredTags = useMemo(
    () => tags.filter((x) => x.kind === tagKindForCurrent),
    [tags, tagKindForCurrent],
  );

  function switchKind(next: TxKind) {
    if (next === kind) return;
    setKind(next);
    // The previously-selected tag almost certainly belongs to the other kind;
    // clear it so the user picks one that fits.
    setTag(null);
    setParts([]);
    setErr(null);
    setMsg(null);
  }

  function currentAmount(): number {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function addPart() {
    const n = currentAmount();
    if (!n) return;
    setParts((cur) => [...cur, n]);
    setAmount('');
  }

  function removePart(idx: number) {
    setParts((cur) => cur.filter((_, i) => i !== idx));
  }

  const partsSum = parts.reduce((a, b) => a + b, 0);
  const total = partsSum + currentAmount();

  async function createTag(name: string): Promise<Tag> {
    const color = randomTagColor();
    const created = await api.createTag(name, color, tagKindForCurrent);
    // Refetch instead of appending so the new tag lands in the server's
    // canonical order (lastUsedAt desc, then createdAt desc).
    await reloadTags();
    return created;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const n = partsSum + currentAmount();
    if (!Number.isInteger(n) || n <= 0) {
      setErr(t('new.invalidAmount'));
      return;
    }
    if (!tag) {
      setErr(t('new.pickTag'));
      return;
    }
    setBusy(true);
    try {
      await api.createTransaction({
        amount: n,
        kind,
        tagId: tag.id,
        note: note.trim() || undefined,
      });
      const messageKey = kind === 'outflow' ? 'new.savedTo' : 'new.savedIncomeTo';
      setMsg(
        t(messageKey, { amount: n.toLocaleString(locale), tag: tag.name }),
      );
      setAmount('');
      setParts([]);
      setNote('');
      setTag(null);
      // Server just bumped this tag's lastUsedAt; refresh so the next entry
      // on this still-mounted screen sees the updated ordering.
      await reloadTags();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('new.failed'));
    } finally {
      setBusy(false);
    }
  }

  const titleKey = kind === 'outflow' ? 'new.title' : 'new.titleIncome';
  const tagLabelKey = kind === 'outflow' ? 'new.tag' : 'new.tagIncome';

  return (
    <section>
      <h2>{t(titleKey)}</h2>
      <div className="kind-toggle" role="tablist" style={{ marginBottom: '0.75rem' }}>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'outflow'}
          className={kind === 'outflow' ? 'primary' : ''}
          onClick={() => switchKind('outflow')}
        >
          {t('new.kindExpense')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'inflow'}
          className={kind === 'inflow' ? 'primary' : ''}
          onClick={() => switchKind('inflow')}
          style={{ marginLeft: '0.4rem' }}
        >
          {t('new.kindIncome')}
        </button>
      </div>

      <form onSubmit={submit}>
        <label>
          <span className="lbl">{t('new.amount')}</span>
          <div className="amount-row">
            <input
              className="big-input"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === '+') {
                  e.preventDefault();
                  addPart();
                }
              }}
              placeholder="0"
            />
            <button
              type="button"
              className="add-part"
              aria-label={t('new.addPart')}
              onClick={addPart}
              disabled={!currentAmount()}
            >
              +
            </button>
          </div>
          {parts.length > 0 && (
            <div className="parts-row">
              {parts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className="part-chip"
                  aria-label={t('new.removePart', {
                    amount: p.toLocaleString(locale),
                  })}
                  onClick={() => removePart(i)}
                  title={t('new.removePart', {
                    amount: p.toLocaleString(locale),
                  })}
                >
                  {p.toLocaleString(locale)} ×
                </button>
              ))}
              <span className="parts-total">
                {t('new.partsTotal', { amount: total.toLocaleString(locale) })}
              </span>
            </div>
          )}
        </label>

        <label>
          <span className="lbl">{t(tagLabelKey)}</span>
          <TagCombobox
            tags={filteredTags}
            value={tag}
            onChange={setTag}
            onCreate={createTag}
          />
          {tag && (
            <div style={{ marginTop: '0.4rem' }}>
              <span
                className="tag-chip"
                style={{
                  background: tag.color ?? '#ddd',
                  color: readableTextColor(tag.color ?? '#dddddd'),
                }}
              >
                {tag.name}
              </span>
            </div>
          )}
        </label>

        <label>
          <span className="lbl">{t('new.note')}</span>
          <input
            className="small-input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('new.notePlaceholder')}
          />
        </label>

        {err && <div className="error">{err}</div>}
        {msg && <div className="muted">{msg}</div>}
        <button className="primary" disabled={busy}>
          {busy ? t('new.saving') : t('new.save')}
        </button>
      </form>
    </section>
  );
}
