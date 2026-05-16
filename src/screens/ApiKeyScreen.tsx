import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { getApiKey, setApiKey } from '../auth';
import { useT } from '../i18n';
import ClearableInput from '../components/ClearableInput';

export default function ApiKeyScreen({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState(getApiKey());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const t = useT();

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
      <h2>{t('apiKey.title')}</h2>
      <p className="muted">{t('apiKey.help')}</p>
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
