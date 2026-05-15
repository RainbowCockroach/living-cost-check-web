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
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { t, locale } = useI18n();

  useEffect(() => {
    api.listTags().then(setTags).catch((e: ApiError) => setErr(e.message));
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
    setErr(null);
    setMsg(null);
  }

  async function createTag(name: string): Promise<Tag> {
    const color = randomTagColor();
    const created = await api.createTag(name, color, tagKindForCurrent);
    setTags((cur) => [...cur, created]);
    return created;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const n = Number(amount);
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
      setNote('');
      setTag(null);
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
          <input
            className="big-input"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
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
