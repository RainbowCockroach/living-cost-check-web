import { useEffect, useState } from 'react';
import { api, ApiError, type Tag } from '../api';
import TagCombobox from '../components/TagCombobox';
import { randomTagColor, readableTextColor } from '../colors';
import { useI18n } from '../i18n';

export default function NewExpenseScreen() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tag, setTag] = useState<Tag | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { t, locale } = useI18n();

  useEffect(() => {
    api.listTags().then(setTags).catch((e: ApiError) => setErr(e.message));
  }, []);

  async function createTag(name: string): Promise<Tag> {
    const color = randomTagColor();
    const created = await api.createTag(name, color);
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
      await api.createExpense({
        amount: n,
        tagId: tag.id,
        note: note.trim() || undefined,
      });
      setMsg(t('new.savedTo', { amount: n.toLocaleString(locale), tag: tag.name }));
      setAmount('');
      setNote('');
      setTag(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('new.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>{t('new.title')}</h2>
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
          <span className="lbl">{t('new.tag')}</span>
          <TagCombobox
            tags={tags}
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
