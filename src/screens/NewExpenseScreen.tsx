import { useEffect, useState } from 'react';
import { api, ApiError, type Tag } from '../api';
import TagCombobox from '../components/TagCombobox';
import { randomTagColor, readableTextColor } from '../colors';

export default function NewExpenseScreen() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tag, setTag] = useState<Tag | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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
      setErr('Amount must be a positive whole number (VND).');
      return;
    }
    if (!tag) {
      setErr('Pick or create a tag.');
      return;
    }
    setBusy(true);
    try {
      await api.createExpense({
        amount: n,
        tagId: tag.id,
        note: note.trim() || undefined,
      });
      setMsg(`Saved ${n.toLocaleString('vi-VN')} ₫ to “${tag.name}”.`);
      setAmount('');
      setNote('');
      setTag(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>New expense</h2>
      <form onSubmit={submit}>
        <label>
          <span className="lbl">Amount (VND)</span>
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
          <span className="lbl">Tag</span>
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
          <span className="lbl">Note (optional)</span>
          <input
            className="small-input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. lunch with team"
          />
        </label>

        {err && <div className="error">{err}</div>}
        {msg && <div className="muted">{msg}</div>}
        <button className="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save expense'}
        </button>
      </form>
    </section>
  );
}
