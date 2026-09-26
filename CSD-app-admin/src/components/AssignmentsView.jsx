import { useEffect, useMemo, useState } from 'react';
import * as storage from '../lib/storage.js';
import { handleApiError } from '../lib/authError.js';
import { STATUS_LABEL, formatDate, formatPrice } from '../lib/format.js';
import EntityListView from './EntityListView.jsx';
import EntityForm from './EntityForm.jsx';

export default function AssignmentsView({ stage, notify, onBack, onOpenAssignment }) {
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(1200);
  const [formBonus, setFormBonus] = useState(false);

  async function reload() {
    try {
      setAssignments(await storage.loadAssignments(stage.id));
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  useEffect(() => { reload(); }, [stage.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments.filter(a => {
      if (q && !a.name.toLowerCase().includes(q)) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      return true;
    });
  }, [assignments, search, statusFilter]);

  function openCreate() {
    setEditing({});
    setFormName('');
    setFormDescription('');
    setFormPrice(1200);
    setFormBonus(false);
  }
  function openEdit(assignment) {
    setEditing(assignment);
    setFormName(assignment.name);
    setFormDescription(assignment.description);
    setFormPrice(assignment.price);
    setFormBonus(Boolean(assignment.bonus));
  }
  function closeForm() {
    setEditing(null);
  }

  async function save() {
    const name = formName.trim();
    if (!name) { notify('Укажите название задания.'); return; }
    const assignment = storage.blankAssignment(stage.id);
    assignment.id = editing.id || null;
    assignment.name = name;
    assignment.description = formDescription.trim();
    assignment.price = Math.max(0, Number(formPrice) || 0);
    assignment.bonus = formBonus;
    try {
      await storage.upsertAssignment(assignment);
      notify(editing.id ? 'Задание обновлено.' : 'Задание создано.');
      closeForm();
      reload();
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  async function remove(assignment) {
    const count = assignment._count ? assignment._count.levels : 0;
    const warning = count ? ` вместе со всеми его задачами (${count})` : '';
    if (!confirm(`Удалить задание «${assignment.name}»${warning}? Это действие необратимо.`)) return;
    try {
      await storage.deleteAssignment(assignment.id);
      notify('Задание удалено.');
      reload();
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  async function setStatus(assignment, status) {
    try {
      await storage.setAssignmentStatus(assignment.id, status);
      notify(status === 'published' ? 'Задание опубликовано.' : 'Задание снято с публикации и перемещено в архив.');
      reload();
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  const backBtn = <button type="button" className="panel-button ghost breadcrumb-back" onClick={onBack}>← К этапам</button>;

  if (editing) {
    const count = editing._count ? editing._count.levels : 0;
    return (
      <EntityForm
        sectionLabel={stage.name}
        title={editing.id ? `Редактировать «${editing.name}»` : 'Новое задание'}
        description="Название и краткое описание — по ним ученик и админ будут узнавать задание в списке."
        onCancel={closeForm}
        onSave={save}
        fields={<>
          <label className="field-label" htmlFor="assignment-form-name">Название</label>
          <input type="text" id="assignment-form-name" className="admin-input entity-form-input" placeholder="Например: Задание 1"
            value={formName} onChange={e => setFormName(e.target.value)} />
          <label className="field-label" htmlFor="assignment-form-description">Описание</label>
          <textarea id="assignment-form-description" className="admin-input entity-form-input" placeholder="Необязательно"
            value={formDescription} onChange={e => setFormDescription(e.target.value)} />
          <label className="field-label" htmlFor="assignment-form-price">Цена, ₽</label>
          <input type="number" id="assignment-form-price" className="admin-input entity-form-input" min="0" step="0.01"
            value={formPrice} onChange={e => setFormPrice(e.target.value)} />
          <label className="toggle-field" style={{ marginTop: 14 }}>
            <input type="checkbox" checked={formBonus} onChange={e => setFormBonus(e.target.checked)} />
            Бонус: выдаётся бесплатно при покупке этапа целиком
          </label>
          <p className="level-card-desc">
            Такое задание не учитывается в рекомендуемой цене этапа: ученик, купивший этап целиком, получает его в подарок. Отдельно его по-прежнему можно купить за указанную цену.
          </p>
        </>}
        preview={
          <article className={'level-card entity-card status-' + (editing.status || 'draft')}>
            <div className="level-card-body">
              <div className="level-card-top">
                <h3>{formName.trim() || 'Название задания'}</h3>
                <span className={'status-pill status-' + (editing.status || 'draft')}>{STATUS_LABEL[editing.status || 'draft']}</span>
              </div>
              <p className="level-card-desc">{formDescription.trim() || 'Без описания'}</p>
              <div className="level-card-meta">
                <span>Задач: {count}</span>
                <span>{formatPrice(Number(formPrice) || 0)}</span>
                {formBonus && <span>♛ Бонус при покупке этапа</span>}
              </div>
            </div>
          </article>
        }
      />
    );
  }

  return (
    <EntityListView
      breadcrumb={backBtn}
      sectionLabel={stage.name}
      title="Все задания"
      count={assignments.length}
      onCreate={openCreate}
      createLabel="Создать задание +"
      toolbar={<>
        <input type="search" className="admin-input" placeholder="Поиск по названию…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="admin-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="published">Опубликован</option>
          <option value="archived">Архив</option>
        </select>
      </>}
      items={filtered}
      emptyText="Заданий пока нет. Нажмите «Создать задание», чтобы добавить первое."
      renderCard={assignment => {
        const count = assignment._count ? assignment._count.levels : 0;
        return (
          <article key={assignment.id} className={'level-card entity-card status-' + assignment.status}>
            <div className="level-card-body">
              <div className="level-card-top">
                <h3>{assignment.name || 'Без названия'}</h3>
                <span className={'status-pill status-' + assignment.status}>{STATUS_LABEL[assignment.status]}</span>
              </div>
              <p className="level-card-desc">{assignment.description || 'Без описания'}</p>
              <div className="level-card-meta">
                <span>Задач: {count}</span>
                <span>Цена: {formatPrice(assignment.price)}</span>
                {assignment.bonus && <span>♛ Бонус при покупке этапа</span>}
                <span>Изменён: {formatDate(assignment.updatedAt)}</span>
              </div>
              <div className="level-card-actions">
                <button type="button" data-action="open" className="panel-button dark" onClick={() => onOpenAssignment(assignment)}>Открыть задачи →</button>
                <button type="button" data-action="edit" className="panel-button ghost" onClick={() => openEdit(assignment)}>Редактировать</button>
                {assignment.status === 'published'
                  ? <button type="button" data-action="unpublish" className="panel-button ghost" onClick={() => setStatus(assignment, 'archived')}>Снять с публикации</button>
                  : <button type="button" data-action="publish" className="panel-button ghost" onClick={() => setStatus(assignment, 'published')}>Опубликовать</button>}
                <button type="button" data-action="delete" className="panel-button ghost danger" onClick={() => remove(assignment)}>Удалить</button>
              </div>
            </div>
          </article>
        );
      }}
    />
  );
}
