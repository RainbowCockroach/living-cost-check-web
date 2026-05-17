import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  ApiError,
  type BudgetTarget,
  type Tag,
  type TargetKind,
} from '../api';
import { readableTextColor } from '../colors';
import { useI18n } from '../i18n';

type FormState = {
  // `id` is set when editing an existing target; null for create.
  id: number | null;
  tagId: number | null;
  kind: TargetKind;
  amount: string;
  dueMonth: string;
  note: string;
};

const KINDS: TargetKind[] = ['by_date', 'monthly_refill', 'monthly_contribution'];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthsBetween(period: string, due: string): number {
  const [y1, m1] = period.split('-').map(Number);
  const [y2, m2] = due.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

function emptyForm(): FormState {
  return {
    id: null,
    tagId: null,
    kind: 'monthly_contribution',
    amount: '',
    dueMonth: currentMonth(),
    note: '',
  };
}

export default function TargetsScreen() {
  const [targets, setTargets] = useState<BudgetTarget[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const { t, locale } = useI18n();

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [tg, tk] = await Promise.all([api.listTargets(), api.listTags()]);
      setTargets(tg);
      setTags(tk);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('targets.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const spendingTags = useMemo(
    () => tags.filter((x) => x.kind === 'spending'),
    [tags],
  );

  const availableTagsForCreate = useMemo(() => {
    const taken = new Set(targets.map((x) => x.tagId));
    return spendingTags.filter((tag) => !taken.has(tag.id));
  }, [spendingTags, targets]);

  function startCreate() {
    const f = emptyForm();
    if (availableTagsForCreate.length > 0) {
      f.tagId = availableTagsForCreate[0].id;
    }
    setForm(f);
    setErr(null);
  }

  function startEdit(target: BudgetTarget) {
    setForm({
      id: target.id,
      tagId: target.tagId,
      kind: target.kind,
      amount: String(target.amount),
      dueMonth: target.dueMonth ?? currentMonth(),
      note: target.note ?? '',
    });
    setErr(null);
  }

  async function save() {
    if (!form) return;
    if (form.tagId == null) {
      setErr(t('targets.invalidTag'));
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setErr(t('targets.invalidAmount'));
      return;
    }
    if (form.kind === 'by_date' && !/^\d{4}-\d{2}$/.test(form.dueMonth)) {
      setErr(t('targets.invalidDueMonth'));
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await api.upsertTarget({
        tagId: form.tagId,
        kind: form.kind,
        amount,
        dueMonth: form.kind === 'by_date' ? form.dueMonth : null,
        note: form.note.trim() ? form.note.trim() : null,
      });
      setForm(null);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('targets.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(target: BudgetTarget) {
    if (!confirm(t('targets.deleteConfirm', { name: target.tag.name }))) return;
    setErr(null);
    try {
      await api.deleteTarget(target.id);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('targets.deleteFailed'));
    }
  }

  return (
    <section>
      <h2>{t('targets.title')}</h2>

      <div className="filter-row">
        <button
          onClick={startCreate}
          disabled={!!form || availableTagsForCreate.length === 0}
        >
          {t('targets.add')}
        </button>
        <span className="spacer" style={{ flex: 1 }} />
        <button onClick={load} disabled={loading}>
          {loading ? t('expenses.loading') : t('expenses.refresh')}
        </button>
      </div>

      {err && <div className="error">{err}</div>}

      {form && (
        <TargetForm
          form={form}
          setForm={setForm}
          onSave={save}
          onCancel={() => {
            setForm(null);
            setErr(null);
          }}
          saving={saving}
          tags={
            // When editing, the current tag stays selectable; on create, only
            // unattached spending tags appear.
            form.id != null
              ? spendingTags.filter(
                  (tag) =>
                    tag.id === form.tagId ||
                    !targets.some((x) => x.tagId === tag.id),
                )
              : availableTagsForCreate
          }
        />
      )}

      {!loading && targets.length === 0 && !form && (
        <div className="muted">{t('targets.empty')}</div>
      )}

      {targets.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{t('budget.col.tag')}</th>
              <th style={{ textAlign: 'left' }}>{t('targets.form.kind')}</th>
              <th style={{ textAlign: 'right' }}>{t('targets.form.amount')}</th>
              <th style={{ textAlign: 'left' }}>{t('targets.form.dueMonth')}</th>
              <th style={{ textAlign: 'left' }}>{t('targets.form.note')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => {
              const bg = target.tag.color ?? '#ddd';
              let dueCell = '';
              if (target.kind === 'by_date' && target.dueMonth) {
                const left = monthsBetween(currentMonth(), target.dueMonth);
                dueCell =
                  left < 0
                    ? `${target.dueMonth} · ${t('targets.monthOverdue')}`
                    : `${target.dueMonth} · ${t('targets.monthsLeft', { n: left })}`;
              }
              return (
                <tr key={target.id}>
                  <td>
                    <span
                      className="tag-chip"
                      style={{ background: bg, color: readableTextColor(bg) }}
                    >
                      {target.tag.name}
                    </span>
                  </td>
                  <td>{t(`targets.kind.${target.kind}` as const)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {target.amount.toLocaleString(locale)}
                  </td>
                  <td>{dueCell}</td>
                  <td>{target.note ?? ''}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => startEdit(target)} disabled={!!form}>
                      {t('targets.edit')}
                    </button>{' '}
                    <button onClick={() => remove(target)} disabled={!!form}>
                      {t('targets.delete')}
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

function TargetForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  tags,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  tags: Tag[];
}) {
  const t = useI18n().t;
  return (
    <div
      style={{
        border: '1px solid var(--border, #ccc)',
        padding: '0.75rem',
        margin: '0.5rem 0',
        borderRadius: 4,
      }}
    >
      <div className="filter-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <label>
          {t('targets.form.tag')}:{' '}
          <select
            value={form.tagId ?? ''}
            onChange={(e) =>
              setForm({ ...form, tagId: e.target.value ? Number(e.target.value) : null })
            }
            disabled={saving || form.id != null}
          >
            <option value="">—</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t('targets.form.kind')}:{' '}
          <select
            value={form.kind}
            onChange={(e) =>
              setForm({ ...form, kind: e.target.value as TargetKind })
            }
            disabled={saving}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`targets.kind.${k}` as const)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t('targets.form.amount')}:{' '}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            disabled={saving}
            style={{ width: '10rem' }}
          />
        </label>

        {form.kind === 'by_date' && (
          <label>
            {t('targets.form.dueMonth')}:{' '}
            <input
              type="month"
              value={form.dueMonth}
              onChange={(e) =>
                e.target.value && setForm({ ...form, dueMonth: e.target.value })
              }
              disabled={saving}
            />
          </label>
        )}
      </div>

      <div className="filter-row" style={{ marginTop: '0.5rem' }}>
        <label style={{ flex: 1 }}>
          {t('targets.form.note')}:{' '}
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            disabled={saving}
            style={{ width: '100%' }}
          />
        </label>
      </div>

      <div className="filter-row" style={{ marginTop: '0.5rem' }}>
        <button onClick={onSave} disabled={saving}>
          {saving ? t('new.saving') : t('targets.form.save')}
        </button>
        <button onClick={onCancel} disabled={saving}>
          {t('targets.form.cancel')}
        </button>
      </div>
    </div>
  );
}
