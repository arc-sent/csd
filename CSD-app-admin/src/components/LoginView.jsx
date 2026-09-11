import { useState } from 'react';

export default function LoginView({ onLogin, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onLogin(email.trim(), password);
      setPassword('');
    } catch (err) {
      // ошибка уже отражена в error (см. useAuth)
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="login-view">
      <div className="container login-wrap">
        <form className="login-card" onSubmit={handleSubmit}>
          <span className="section-label">Вход</span>
          <h2>Админ-панель ChessSchoolDinamik</h2>
          <p>Войдите под учётной записью администратора, чтобы управлять уровнями.</p>
          <label className="field-label" htmlFor="login-email">Email</label>
          <input
            type="email" id="login-email" className="admin-input" autoComplete="username" required
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <label className="field-label" htmlFor="login-password">Пароль</label>
          <input
            type="password" id="login-password" className="admin-input" autoComplete="current-password" required
            value={password} onChange={e => setPassword(e.target.value)}
          />
          <p className={'feedback error validation-msg' + (error ? ' show' : '')}>{error}</p>
          <button type="submit" className="button button-primary" disabled={submitting}>Войти</button>
        </form>
      </div>
    </section>
  );
}
