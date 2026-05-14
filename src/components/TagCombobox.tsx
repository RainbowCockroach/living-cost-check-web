import { useEffect, useMemo, useRef, useState } from 'react';
import type { Tag } from '../api';

type Props = {
  tags: Tag[];
  value: Tag | null;
  onChange: (tag: Tag | null) => void;
  // Called when the user selects "Create <name>". Parent issues the POST /tags.
  onCreate: (name: string) => Promise<Tag>;
};

export default function TagCombobox({ tags, value, onChange, onCreate }: Props) {
  const [text, setText] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value?.name ?? '');
  }, [value]);

  // Close the dropdown on outside click — there's no native popover here.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return tags.slice(0, 10);
    return tags
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [text, tags]);

  const exact = useMemo(
    () => tags.find((t) => t.name.toLowerCase() === text.trim().toLowerCase()),
    [text, tags],
  );
  const canCreate = text.trim().length > 0 && !exact;

  // Options array length = matches + (1 if canCreate). Used for keyboard nav bounds.
  const optionCount = matches.length + (canCreate ? 1 : 0);

  async function pick(index: number) {
    if (index < matches.length) {
      const t = matches[index];
      onChange(t);
      setText(t.name);
      setOpen(false);
      return;
    }
    // Create option.
    setBusy(true);
    try {
      const created = await onCreate(text.trim());
      onChange(created);
      setText(created.name);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((i) => Math.min(i + 1, optionCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (optionCount > 0) pick(hi);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="combobox" ref={wrap}>
      <input
        className="big-input"
        value={text}
        placeholder="search or create a tag"
        onChange={(e) => {
          setText(e.target.value);
          setHi(0);
          setOpen(true);
          // Typing breaks the previous selection until the user re-confirms.
          if (value && e.target.value !== value.name) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        disabled={busy}
        autoComplete="off"
      />
      {open && optionCount > 0 && (
        <div className="options">
          {matches.map((t, i) => (
            <div
              key={t.id}
              className={i === hi ? 'highlight' : ''}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(i);
              }}
            >
              <span
                className="tag-chip"
                style={{ background: t.color ?? '#ddd' }}
              >
                {t.name}
              </span>
            </div>
          ))}
          {canCreate && (
            <div
              className={`create ${hi === matches.length ? 'highlight' : ''}`}
              onMouseEnter={() => setHi(matches.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(matches.length);
              }}
            >
              + Create “{text.trim()}”
            </div>
          )}
        </div>
      )}
    </div>
  );
}
