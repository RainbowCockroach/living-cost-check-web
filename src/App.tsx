import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { hasApiKey } from './auth';
import { LanguageSwitcher, useT } from './i18n';
import ApiKeyScreen from './screens/ApiKeyScreen';
import NewExpenseScreen from './screens/NewExpenseScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import BudgetScreen from './screens/BudgetScreen';

export default function App() {
  // `keyVersion` lets child screens trigger a re-render of the guard after the
  // user saves or clears a key without us reaching for any global store.
  const [keyVersion, setKeyVersion] = useState(0);
  const bump = () => setKeyVersion((v) => v + 1);
  const authed = hasApiKey();

  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();

  // If the key disappears (e.g. 401 cleared it from api.ts), bounce to /key.
  useEffect(() => {
    if (!authed && location.pathname !== '/key') navigate('/key', { replace: true });
  }, [authed, location.pathname, navigate]);

  return (
    <div className="app" key={keyVersion}>
      <nav>
        <NavLink to="/new" className={({ isActive }) => (isActive ? 'active' : '')}>
          {t('nav.new')}
        </NavLink>
        <NavLink to="/expenses" className={({ isActive }) => (isActive ? 'active' : '')}>
          {t('nav.expenses')}
        </NavLink>
        <NavLink to="/budget" className={({ isActive }) => (isActive ? 'active' : '')}>
          {t('nav.budget')}
        </NavLink>
        <LanguageSwitcher />
        <NavLink to="/key" className={({ isActive }) => (isActive ? 'active' : '')}>
          {t('nav.apiKey')}
        </NavLink>
      </nav>

      <Routes>
        <Route path="/key" element={<ApiKeyScreen onSaved={bump} />} />
        <Route
          path="/new"
          element={authed ? <NewExpenseScreen /> : <Navigate to="/key" replace />}
        />
        <Route
          path="/expenses"
          element={authed ? <ExpensesScreen /> : <Navigate to="/key" replace />}
        />
        <Route
          path="/budget"
          element={authed ? <BudgetScreen /> : <Navigate to="/key" replace />}
        />
        <Route
          path="*"
          element={<Navigate to={authed ? '/new' : '/key'} replace />}
        />
      </Routes>
    </div>
  );
}
