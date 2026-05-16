import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Tag, type TagKind } from '../api';
import { randomTagColor, readableTextColor } from '../colors';
import { useT } from '../i18n';

// CRUD for both spending and income tags. Two tabs share the same list state;
// PATCH/DELETE go straight to the server and we reload on success. Inline edit
// matches BudgetScreen: edits commit on blur or Enter, no per-row save button.
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
    <section>
      <h2>{t('tags.title')}</h2>

      <div className="filter-row">
        <button
          onClick={() => setTab('spending')}
          className={tab === 'spending' ? 'active' : ''}
        >
          {t('tags.tab.spending')}
        </button>
        <button
          onClick={() => setTab('income')}
          className={tab === 'income' ? 'active' : ''}
        >
          {t('tags.tab.income')}
        </button>
        <span className="spacer" style={{ flex: 1 }} />
        <button onClick={load} disabled={loading}>
          {loading ? t('expenses.loading') : t('expenses.refresh')}
        </button>
      </div>

      <div className="filter-row" style={{ marginTop: '0.5rem' }}>
        <input
          type="text"
          placeholder={t('tags.new.name')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create();
          }}
          disabled={creating}
          style={{ flex: 1 }}
        />
        <button onClick={create} disabled={creating || !newName.trim()}>
          {t('tags.new.add')}
        </button>
      </div>

      {err && <div className="error">{err}</div>}

      {!loading && visible.length === 0 && (
        <div className="muted">{t('tags.empty')}</div>
      )}

      {visible.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{t('tags.col.name')}</th>
              <th style={{ textAlign: 'left' }}>{t('tags.col.color')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
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
                <tr key={tag.id}>
                  <td style={{ padding: '0.25rem 0' }}>
                    <span
                      className="tag-chip"
                      style={{
                        background: chipBg,
                        color: readableTextColor(chipBg),
                        marginRight: '0.5rem',
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
                  </td>
                  <td style={{ padding: '0.25rem 0' }}>
                    <input
                      type="color"
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
                  </td>
                  <td style={{ padding: '0.25rem 0', textAlign: 'right' }}>
                    <button onClick={() => remove(tag)} disabled={isSaving}>
                      {t('tags.delete')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
