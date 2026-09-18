import { useEffect, useMemo, useState } from 'react';
import * as storage from '../lib/storage.js';
import { handleApiError } from '../lib/authError.js';
import { STATUS_LABEL, formatDate, formatPrice, stageDiscountPercent } from '../lib/format.js';
import EntityListView from './EntityListView.jsx';
import EntityForm from './EntityForm.jsx';

export default function StagesView({ notify, onOpenStage }) {
  const [stages, setStages] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState(null); // null = список, {} = создание, {...} = редактирование
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(0);

  async function reload() {
    try {
      setStages(await storage.loadStages());
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stages.filter(s => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      return true;
    });
  }, [stages, search, statusFilter]);

  function openCreate() {
    setEditing({});
    setFormName('');
    setFormDescription('');
    setFormPrice(0);
  }
  function openEdit(stage) {
    setEditing(stage);
    setFormName(stage.name);
    setFormDescription(stage.description);
    setFormPrice(stage.price || 0);
  }
  function closeForm() {
    setEditing(null);
  }

  async function save() {
    const name = formName.trim();
    if (!name) { notify('Укажите название этапа.'); return; }
    const stage = storage.blankStage();
    stage.id = editing.id || null;
    stage.name = name;
    stage.description = formDescription.trim();
    stage.price = Math.max(0, Number(formPrice) || 0);
    try {
      await storage.upsertStage(stage);
      notify(editing.id ? 'Этап обновлён.' : 'Этап создан.');
      closeForm();
      reload();
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  async function remove(stage) {
    const count = stage._count ? stage._count.assignments : 0;
    const warning = count ? ` вместе со всеми его заданиями (${count}) и их задачами` : '';
    if (!confirm(`Удалить этап «${stage.name}»${warning}? Это действие необратимо.`)) return;
    try {
      await storage.deleteStage(stage.id);
      notify('Этап удалён.');
      reload();
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  async function setStatus(stage, status) {
    try {
      await storage.setStageStatus(stage.id, status);
      notify(status === 'published' ? 'Этап опубликован.' : 'Этап снят с публикации и перемещён в архив.');
      reload();
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  if (editing) {
    const count = editing._count ? editing._count.assignments : 0;
    const total = editing.assignmentsTotal || 0;
    const priceNum = Number(formPrice) || 0;
    const discount = stageDiscountPercent(priceNum, total);
    return (
      <EntityForm
        sectionLabel="Курс"
        title={editing.id ? `Редактировать «${editing.name}»` : 'Новый этап'}
        description="Название и краткое описание — по ним ученик и админ будут узнавать этап в списке."
        onCancel={closeForm}
        onSave={save}
        fields={<>
          <label className="field-label" htmlFor="stage-form-name">Название</label>
          <input type="text" id="stage-form-name" className="admin-input entity-form-input" placeholder="Например: Этап 1"
            value={formName} onChange={e => setFormName(e.target.value)} />
          <label className="field-label" htmlFor="stage-form-description">Описание</label>
          <textarea id="stage-form-description" className="admin-input entity-form-input" placeholder="Необязательно"
            value={formDescription} onChange={e => setFormDescription(e.target.value)} />
          <label className="field-label" htmlFor="stage-form-price">Цена этапа целиком, ₽</label>
          <input type="number" id="stage-form-price" className="admin-input entity-form-input" min="0" step="0.01"
            value={formPrice} onChange={e => setFormPrice(e.target.value)} />
          <p className="level-card-desc">
            {priceNum <= 0
              ? 'Покупка этапа целиком выключена (цена 0) — задания продаются только поштучно.'
              : total <= 0
                ? 'В этапе нет опубликованных заданий с ценой — скидку посчитать не с чем.'
                : `Сумма опубликованных заданий: ${formatPrice(total)}. ${
                    discount > 0 ? `Скидка за этап целиком: −${discount}%.` : 'Цена не ниже суммы заданий — скидки нет.'
                  }`}
          </p>
        </>}
        preview={
          <article className={'level-card entity-card status-' + (editing.status || 'draft')}>
            <div className="level-card-body">
              <div className="level-card-top">
                <h3>{formName.trim() || 'Название этапа'}</h3>
                <span className={'status-pill status-' + (editing.status || 'draft')}>{STATUS_LABEL[editing.status || 'draft']}</span>
              </div>
              <p className="level-card-desc">{formDescription.trim() || 'Без описания'}</p>
              <div className="level-card-meta">
                <span>Заданий: {count}</span>
                <span>Целиком: {priceNum > 0 ? formatPrice(priceNum) : 'не продаётся'}</span>
                {discount > 0 && <span>Скидка: −{discount}%</span>}
              </div>
            </div>
          </article>
        }
      />
    );
  }

  return (
    <EntityListView
      sectionLabel="Курс"
      title="Все этапы"
      count={stages.length}
      onCreate={openCreate}
      createLabel="Создать этап +"
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
      emptyText="Этапов пока нет. Нажмите «Создать этап», чтобы добавить первый."
      renderCard={stage => {
        const count = stage._count ? stage._count.assignments : 0;
        const discount = stageDiscountPercent(stage.price, stage.assignmentsTotal);
        return (
          <article key={stage.id} className={'level-card entity-card status-' + stage.status}>
            <div className="level-card-body">
              <div className="level-card-top">
                <h3>{stage.name || 'Без названия'}</h3>
                <span className={'status-pill status-' + stage.status}>{STATUS_LABEL[stage.status]}</span>
              </div>
              <p className="level-card-desc">{stage.description || 'Без описания'}</p>
              <div className="level-card-meta">
                <span>Заданий: {count}</span>
                <span>Целиком: {stage.price > 0 ? formatPrice(stage.price) : 'не продаётся'}</span>
                {discount > 0 && <span>Скидка: −{discount}%</span>}
                <span>Изменён: {formatDate(stage.updatedAt)}</span>
              </div>
              <div className="level-card-actions">
                <button type="button" data-action="open" className="panel-button dark" onClick={() => onOpenStage(stage)}>Открыть задания →</button>
                <button type="button" data-action="edit" className="panel-button ghost" onClick={() => openEdit(stage)}>Редактировать</button>
                {stage.status === 'published'
                  ? <button type="button" data-action="unpublish" className="panel-button ghost" onClick={() => setStatus(stage, 'archived')}>Снять с публикации</button>
                  : <button type="button" data-action="publish" className="panel-button ghost" onClick={() => setStatus(stage, 'published')}>Опубликовать</button>}
                <button type="button" data-action="delete" className="panel-button ghost danger" onClick={() => remove(stage)}>Удалить</button>
              </div>
            </div>
          </article>
        );
      }}
    />
  );
}
