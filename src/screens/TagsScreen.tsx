import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Tag, type TagKind } from '../api';
import { randomTagColor, readableTextColor } from '../colors';
import { useT } from '../i18n';

// CRUD for both spending and income tags. Two tabs share the same list state;
// PATCH/DELETE go straight to the server and we reload on success. Inline edit
// matches BudgetScreen: edits commit on blur or Enter, no per-row save button.
//
// The kind tabs are intentionally plain buttons (not the KindSegmented pill) —
// spending/income tags do map 1:1 to outflow/inflow, but here we're filtering
// a list rather than authoring a transaction, so the colored +/− glyph and the
// red/green underline would over-signal direction. A subtle .is-active state
// is enough.
export default function TagsScreen() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tab, setTab] = useState<TagKind>('spending');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Per-tag draft buffers; only the changed field is patched on commit.
  const [nameDrafts, setNameDrafts] = useState<Record<number, string>>({});
  const [colorDrafts, setColorDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const t = useT();

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await api.listTags();
      setTags(list);
      setNameDrafts({});
      setColorDrafts({});
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('tags.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function commitName(tag: Tag) {
    const draft = nameDrafts[tag.id];
    if (draft === undefined) return;
    const next = draft.trim();
    if (!next) {
      setErr(t('tags.invalidName'));
      return;
    }
    if (next === tag.name) {
      setNameDrafts((d) => {
        const { [tag.id]: _, ...rest } = d;
        return rest;
      });
      return;
    }
    setSavingId(tag.id);
    setErr(null);
    try {
      await api.updateTag(tag.id, { name: next });
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('tags.saveFailed'));
    } finally {
      setSavingId(null);
    }
  }

  async function commitColor(tag: Tag) {
    const draft = colorDrafts[tag.id];
    if (draft === undefined) return;
    if (draft === (tag.color ?? '')) {
      setColorDrafts((d) => {
        const { [tag.id]: _, ...rest } = d;
        return rest;
      });
      return;
    }
    setSavingId(tag.id);
    setErr(null);
    try {
      await api.updateTag(tag.id, { color: draft || null });
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('tags.saveFailed'));
    } finally {
      setSavingId(null);
    }
  }

  async function create() {
    const name = newName.trim();
    if (!name) {
      setErr(t('tags.invalidName'));
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      await api.createTag(name, randomTagColor(), tab);
      setNewName('');
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('tags.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  async function remove(tag: Tag) {
    if (!confirm(t('tags.deleteConfirm', { name: tag.name }))) return;
    setSavingId(tag.id);
    setErr(null);
    try {
      await api.deleteTag(tag.id);
      await load();
    } catch (e) {
      // 409 surfaces the server's "tag is used by N transaction(s)…" message.
      setErr(e instanceof ApiError ? e.message : t('tags.deleteFailed'));
    } finally {
      setSavingId(null);
    }
  }

  const visible = tags.filter((x) => x.kind === tab);

  return (
    <section className="tags">
      <h2>{t('tags.title')}</h2>

      <div className="tags__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'spending'}
          className={`tags__tab ${tab === 'spending' ? 'is-active' : ''}`}
          onClick={() => setTab('spending')}
        >
          {t('tags.tab.spending')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'income'}
          className={`tags__tab ${tab === 'income' ? 'is-active' : ''}`}
          onClick={() => setTab('income')}
        >
          {t('tags.tab.income')}
        </button>
        <span className="spacer" />
        <button onClick={load} disabled={loading}>
          {loading ? t('expenses.loading') : t('expenses.refresh')}
        </button>
      </div>

      <div className="field tags__create">
        <input
          type="text"
          placeholder={t('tags.new.name')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create();
          }}
          disabled={creating}
        />
        <button onClick={create} disabled={creating || !newName.trim()}>
          {t('tags.new.add')}
        </button>
      </div>

      {err && <div className="error" role="alert">{err}</div>}

      {!loading && visible.length === 0 && (
        <div className="muted">{t('tags.empty')}</div>
      )}

      {visible.length > 0 && (
        <div className="tag-rows">
          <div className="tag-rows__head">
            <span>{t('tags.col.name')}</span>
            <span>{t('tags.col.color')}</span>
          </div>
          {visible.map((tag) => {
            const nameValue =
              nameDrafts[tag.id] !== undefined ? nameDrafts[tag.id] : tag.name;
            const colorValue =
              colorDrafts[tag.id] !== undefined
                ? colorDrafts[tag.id]
                : tag.color ?? '#cccccc';
            const chipBg = colorValue || '#ddd';
            const isSaving = savingId === tag.id;
            return (
              <div className="tag-row" key={tag.id}>
                <div className="tag-row__name">
                  <span
                    className="tag-chip"
                    style={{
                      background: chipBg,
                      color: readableTextColor(chipBg),
                    }}
                  >
                    {tag.name}
                  </span>
                  <input
                    type="text"
                    value={nameValue}
                    disabled={isSaving}
                    onChange={(e) =>
                      setNameDrafts((d) => ({ ...d, [tag.id]: e.target.value }))
                    }
                    onBlur={() => commitName(tag)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>
                <div className="tag-row__color">
                  <input
                    type="color"
                    aria-label={t('tags.col.color')}
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(colorValue)
                        ? colorValue
                        : '#cccccc'
                    }
                    disabled={isSaving}
                    onChange={(e) =>
                      setColorDrafts((d) => ({
                        ...d,
                        [tag.id]: e.target.value,
                      }))
                    }
                    onBlur={() => commitColor(tag)}
                  />
                  <button onClick={() => remove(tag)} disabled={isSaving}>
                    {t('tags.delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
