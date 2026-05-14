import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { getApiKey, setApiKey } from '../auth';

export default function ApiKeyScreen({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState(getApiKey());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setErr('API key is required.');
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
      const msg = e instanceof ApiError ? e.message : 'Could not reach the server.';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>API key</h2>
      <p className="muted">
        Paste your personal API key. It is stored in your browser&apos;s
        localStorage on this device only.
      </p>
      <form onSubmit={save}>
        <label>
          <span className="lbl">Key</span>
          <input
            className="big-input"
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="paste key here"
          />
        </label>
        {err && <div className="error">{err}</div>}
        <button className="primary" disabled={busy}>
          {busy ? 'Verifying…' : 'Save'}
        </button>
      </form>
    </section>
  );
}
