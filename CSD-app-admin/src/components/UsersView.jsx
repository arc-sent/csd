import { useEffect, useState } from 'react';
import * as storage from '../lib/storage.js';
import { handleApiError } from '../lib/authError.js';
import { formatDate } from '../lib/format.js';
import EntityListView from './EntityListView.jsx';

export default function UsersView({ notify }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);

  async function reload(q) {
    try {
      setUsers(await storage.loadUsers({ q }));
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  useEffect(() => {
    const id = setTimeout(() => reload(search.trim()), search ? 300 : 0);
    return () => clearTimeout(id);
  }, [search]);

  if (openId) {
    return (
      <UserCard
        userId={openId}
        notify={notify}
        onBack={() => { setOpenId(null); reload(search.trim()); }}
      />
    );
  }

  return (
    <EntityListView
      sectionLabel="Клиенты"
      title="Аккаунты"
      count={users.length}
      toolbar={
        <input type="search" className="admin-input" placeholder="Поиск по почте…"
          value={search} onChange={e => setSearch(e.target.value)} />
      }
      toolbarClassName="entity-toolbar-single"
      items={users}
      emptyText="Аккаунтов не найдено."
      renderCard={user => (
        <article key={user.id} className="level-card entity-card status-published">
          <div className="level-card-body">
            <div className="level-card-top">
              <h3>{user.email}</h3>
            </div>
            <p className="level-card-desc">{user.name || 'Без имени'}</p>
            <div className="level-card-meta">
              <span>Платежей: {user._count.payments}</span>
              <span>Выдач: {user._count.grants}</span>
              <span>Регистрация: {formatDate(user.createdAt)}</span>
            </div>
            <div className="level-card-actions">
              <button type="button" className="panel-button dark" onClick={() => setOpenId(user.id)}>
                Доступы →
              </button>
            </div>
          </div>
        </article>
      )}
    />
  );
}

function UserCard({ userId, notify, onBack }) {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [stages, setStages] = useState([]);
  const [mode, setMode] = useState('assignment');
  const [assignmentId, setAssignmentId] = useState('');
  const [stageId, setStageId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      setUser(await storage.getUser(userId));
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  useEffect(() => {
    reload();
    storage.loadAssignments().then(setAssignments).catch(() => {});
    storage.loadStages().then(setStages).catch(() => {});
  }, [userId]);

  async function grant() {
    const isStage = mode === 'stage';
    if (isStage ? !stageId : !assignmentId) { notify(isStage ? 'Выберите этап.' : 'Выберите задание.'); return; }
    setBusy(true);
    try {
      const result = await storage.grantAssignment(
        userId,
        isStage ? { stageId, note: note.trim() } : { assignmentId, note: note.trim() }
      );
      if (isStage) {
        notify(`Этап выдан: открыто заданий — ${result.granted}` + (result.skipped ? `, уже было — ${result.skipped}.` : '.'));
      } else {
        notify('Доступ выдан.');
      }
      setAssignmentId('');
      setStageId('');
      setNote('');
      await reload();
    } catch (err) {
      handleApiError(err, notify);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(access) {
    const paid = access.source === 'payment';
    const question = paid
      ? `Отозвать ручную выдачу «${access.assignment.name}»? Задание оплачено, поэтому доступ у аккаунта останется.`
      : `Отозвать доступ к «${access.assignment.name}»? Задание пропадёт из кабинета ученика.`;
    if (!confirm(question)) return;
    setBusy(true);
    try {
      await storage.revokeGrant(userId, access.grant.id);
      notify(paid ? 'Выдача отозвана, оплаченный доступ сохранён.' : 'Доступ отозван.');
      await reload();
    } catch (err) {
      handleApiError(err, notify);
    } finally {
      setBusy(false);
    }
  }

  const backBtn = (
    <button type="button" className="panel-button ghost breadcrumb-back" onClick={onBack}>← К аккаунтам</button>
  );

  if (!user) return <div className="entity-form-screen">{backBtn}</div>;

  const ownedIds = new Set(user.access.map(a => a.assignment.id));
  const grantable = assignments.filter(a => !ownedIds.has(a.id));
  const grantableStages = stages.filter(s =>
    assignments.some(a => a.stageId === s.id && a.status === 'published' && !ownedIds.has(a.id))
  );
  const isStageMode = mode === 'stage';

  return (
    <div className="entity-form-screen">
      {backBtn}
      <div className="section-intro-admin">
        <span className="section-label">Аккаунт</span>
        <h2>{user.email}</h2>
        <p>{user.name ? user.name + ' · ' : ''}Регистрация: {formatDate(user.createdAt)}</p>
      </div>

      <div className="entity-form-layout">
        <div className="entity-form-fields">
          <span className="field-label">Доступные задания <span className="muted-count">{user.access.length}</span></span>
          {user.access.length === 0
            ? <p className="empty-state" style={{ display: 'block' }}>Доступов пока нет.</p>
            : <div className="access-list">
                {user.access.map(access => (
                  <div key={access.assignment.id} className="access-row">
                    <div className="access-row-main">
                      <strong>{access.assignment.name}</strong>
                      <span className="access-row-meta">
                        {access.assignment.stage ? access.assignment.stage.name + ' · ' : ''}
                        {access.source === 'payment' ? 'куплено' : 'выдано вручную'} {formatDate(access.acquiredAt)}
                      </span>
                      {access.grant && access.grant.note && (
                        <span className="access-row-meta">Заметка: {access.grant.note}</span>
                      )}
                    </div>
                    {access.grant && (
                      <button type="button" className="panel-button ghost danger" disabled={busy}
                        onClick={() => revoke(access)}>
                        Отозвать
                      </button>
                    )}
                  </div>
                ))}
              </div>}
        </div>

        <div className="entity-form-preview">
          <span className="field-label">Выдать доступ вручную</span>
          <div className="grant-form">
            <select className="admin-input" value={mode} onChange={e => setMode(e.target.value)}>
              <option value="assignment">Одно задание</option>
              <option value="stage">Этап целиком</option>
            </select>
            {isStageMode ? (
              <select className="admin-input" value={stageId} onChange={e => setStageId(e.target.value)}>
                <option value="">Выберите этап…</option>
                {grantableStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : (
              <select className="admin-input" value={assignmentId} onChange={e => setAssignmentId(e.target.value)}>
                <option value="">Выберите задание…</option>
                {grantable.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
            <input type="text" className="admin-input" placeholder="Зачем выдали (необязательно)"
              value={note} onChange={e => setNote(e.target.value)} />
            <button type="button" className="panel-button dark"
              disabled={busy || (isStageMode ? !stageId : !assignmentId)} onClick={grant}>
              Выдать доступ
            </button>
            <p className="grant-form-hint">
              {isStageMode
                ? 'Откроются все опубликованные задания этапа, которых у аккаунта ещё нет. Каждое можно отозвать отдельно.'
                : 'Выданное задание сразу появится в кабинете ученика, оплата не потребуется.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
