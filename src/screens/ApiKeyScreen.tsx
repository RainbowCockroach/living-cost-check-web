import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import {
  clearAuthBreadcrumb,
  getApiKey,
  readAuthBreadcrumb,
  setApiKey,
} from '../auth';
import { useI18n } from '../i18n';
import ClearableInput from '../components/ClearableInput';

export default function ApiKeyScreen({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState(getApiKey());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Read once on mount so the hint stays visible while the user is editing,
  // and disappears only after a successful save (or explicit dismiss).
  const [breadcrumb, setBreadcrumb] = useState(() => readAuthBreadcrumb());
  // Snapshot the stored key length at mount — useful for distinguishing
  // "storage was wiped" (length 0) from "key is stale or rejected" (length > 0)
  // when debugging Android / Samsung Internet reports.
  const [storedLengthAtMount] = useState(() => getApiKey().length);
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setErr(t('apiKey.required'));
      return;
    }
    setBusy(true);
    setApiKey(trimmed);
    try {
      // Verifying against /me confirms the key works before we leave this screen.
      await api.me();
      clearAuthBreadcrumb();
      setBreadcrumb(null);
      onSaved();
      navigate('/new');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('apiKey.unreachable');
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <p className="muted">{t('apiKey.help')}</p>
      {breadcrumb && (
        <p className="muted" role="status">
          {t('apiKey.lastError', {
            status: breadcrumb.status,
            path: breadcrumb.path,
            at: new Date(breadcrumb.at).toLocaleString(locale),
          })}
        </p>
      )}
      <p className="muted">
        {storedLengthAtMount > 0
          ? t('apiKey.storedPresent', { length: storedLengthAtMount })
          : t('apiKey.storedMissing')}
      </p>
      <form onSubmit={save}>
        <label>
          <span className="lbl">{t('apiKey.label')}</span>
          <ClearableInput
            className="big-input"
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('apiKey.placeholder')}
            onClear={() => setValue('')}
          />
        </label>
        {err && <div className="error">{err}</div>}
        <button className="primary" disabled={busy}>
          {busy ? t('apiKey.verifying') : t('apiKey.save')}
        </button>
      </form>
    </section>
  );
}
