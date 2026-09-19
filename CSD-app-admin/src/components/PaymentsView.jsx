import { useEffect, useState } from 'react';
import * as storage from '../lib/storage.js';
import { handleApiError } from '../lib/authError.js';
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_PILL, formatAmount, formatDate } from '../lib/format.js';
import EntityListView from './EntityListView.jsx';

export default function PaymentsView({ notify }) {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [assignmentFilter, setAssignmentFilter] = useState('');
  const [refreshing, setRefreshing] = useState(null);

  async function reload(params) {
    try {
      setPayments(await storage.loadPayments(params));
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  useEffect(() => {
    storage.loadAssignments().then(setAssignments).catch(() => {});
  }, []);

  useEffect(() => {
    const params = { q: search.trim(), status: statusFilter, assignmentId: assignmentFilter };
    const id = setTimeout(() => reload(params), search ? 300 : 0);
    return () => clearTimeout(id);
  }, [search, statusFilter, assignmentFilter]);

  async function refresh(payment) {
    setRefreshing(payment.id);
    try {
      const updated = await storage.refreshPayment(payment.id);
      setPayments(list =>
        statusFilter && updated.status !== statusFilter
          ? list.filter(p => p.id !== updated.id)
          : list.map(p => (p.id === updated.id ? updated : p))
      );
      notify(
        updated.status === payment.status
          ? 'Статус не изменился: ' + PAYMENT_STATUS_LABEL[updated.status].toLowerCase() + '.'
          : 'Новый статус: ' + PAYMENT_STATUS_LABEL[updated.status].toLowerCase() + '.'
      );
    } catch (err) {
      handleApiError(err, notify);
    } finally {
      setRefreshing(null);
    }
  }

  return (
    <EntityListView
      sectionLabel="Продажи"
      title="Платежи"
      count={payments.length}
      toolbarClassName="payments-toolbar"
      toolbar={<>
        <input type="search" className="admin-input" placeholder="Поиск по почте…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="admin-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="pending">Ожидает оплаты</option>
          <option value="succeeded">Оплачен</option>
          <option value="canceled">Отменён</option>
        </select>
        <select className="admin-input" value={assignmentFilter} onChange={e => setAssignmentFilter(e.target.value)}>
          <option value="">Все задания</option>
          {assignments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </>}
      items={payments}
      emptyText="Платежей нет. Как только кто-то оплатит задание, он появится здесь."
      renderCard={payment => {
        const pill = PAYMENT_STATUS_PILL[payment.status] || 'draft';
        return (
          <article key={payment.id} className={'level-card entity-card status-' + pill}>
            <div className="level-card-body">
              <div className="level-card-top">
                <h3>{payment.email}</h3>
                <span className={'status-pill status-' + pill}>
                  {PAYMENT_STATUS_LABEL[payment.status] || payment.status}
                </span>
              </div>
              <p className="level-card-desc">
                {payment.assignment ? payment.assignment.name : 'Задание удалено'}
              </p>
              <div className="level-card-meta">
                <span>{formatAmount(payment.amount, payment.currency)}</span>
                <span>Создан: {formatDate(payment.createdAt)}</span>
                <span>Аккаунт: {payment.user ? payment.user.email : 'удалён'}</span>
                <span className="payment-id">ЮKassa: {payment.yookassaId}</span>
              </div>
              <div className="level-card-actions">
                <button type="button" className="panel-button ghost"
                  disabled={refreshing === payment.id}
                  onClick={() => refresh(payment)}>
                  {refreshing === payment.id ? 'Проверяем…' : 'Обновить статус'}
                </button>
              </div>
            </div>
          </article>
        );
      }}
    />
  );
}
