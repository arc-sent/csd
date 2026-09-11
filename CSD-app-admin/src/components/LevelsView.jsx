import { useEffect, useMemo, useState } from 'react';
import * as storage from '../lib/storage.js';
import { handleApiError } from '../lib/authError.js';
import { STATUS_LABEL, DIFFICULTY_LABEL, formatDate } from '../lib/format.js';
import MiniBoard from './MiniBoard.jsx';

function sortLevels(list, mode) {
  const copy = list.slice();
  switch (mode) {
    case 'name-asc': return copy.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    case 'name-desc': return copy.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
    case 'moves-asc': return copy.sort((a, b) => a.steps.length - b.steps.length);
    case 'moves-desc': return copy.sort((a, b) => b.steps.length - a.steps.length);
    case 'created-asc': return copy.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    default: return copy.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
}

export default function LevelsView({ assignment, notify, onBack, onCreateTask, onEditTask }) {
  const [levels, setLevels] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [sortMode, setSortMode] = useState('updated-desc');

  async function reload() {
    try {
      setLevels(await storage.loadLevels(assignment.id));
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  useEffect(() => { reload(); }, [assignment.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = levels.filter(l => {
      if (q && !l.name.toLowerCase().includes(q) && !l.id.toLowerCase().includes(q)) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      if (difficultyFilter && l.difficulty !== difficultyFilter) return false;
      return true;
    });
    return sortLevels(list, sortMode);
  }, [levels, search, statusFilter, difficultyFilter, sortMode]);

  async function remove(level) {
    if (!confirm(`Удалить задачу «${level.name}»? Это действие необратимо.`)) return;
    try {
      await storage.deleteLevel(level.id);
      notify('Задача удалена.');
      reload();
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  async function setStatus(level, status) {
    try {
      await storage.setLevelStatus(level.id, status);
      notify(status === 'published' ? 'Задача опубликована.' : 'Задача снята с публикации и перемещена в архив.');
      reload();
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  return (
    <div className="entity-list">
      <button type="button" className="panel-button ghost breadcrumb-back" onClick={onBack}>← К заданиям</button>
      <div className="admin-view-head">
        <div>
          <span className="section-label">{assignment.name}</span>
          <h2>Все задачи <span className="muted-count">{levels.length}</span></h2>
        </div>
        <button type="button" className="button button-primary" onClick={onCreateTask}>Создать задачу +</button>
      </div>

      <div className="levels-toolbar">
        <input type="search" className="admin-input" placeholder="Поиск по названию или ID…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="admin-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="published">Опубликован</option>
          <option value="archived">Архив</option>
        </select>
        <select className="admin-input" value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}>
          <option value="">Любая сложность</option>
          <option value="easy">Лёгкая</option>
          <option value="medium">Средняя</option>
          <option value="hard">Сложная</option>
        </select>
        <select className="admin-input" value={sortMode} onChange={e => setSortMode(e.target.value)}>
          <option value="updated-desc">Сначала изменённые</option>
          <option value="created-asc">Сначала старые</option>
          <option value="name-asc">Название А→Я</option>
          <option value="name-desc">Название Я→А</option>
          <option value="moves-asc">Меньше ходов</option>
          <option value="moves-desc">Больше ходов</option>
        </select>
      </div>

      {filtered.length === 0
        ? <p className="empty-state" style={{ display: 'block' }}>Задач пока нет. Нажмите «Создать задачу», чтобы добавить первую.</p>
        : (
          <div className="levels-grid">
            {filtered.map(level => (
              <article key={level.id} className="level-card">
                <MiniBoard position={level.position} />
                <div className="level-card-body">
                  <div className="level-card-top">
                    <h3>{level.name || 'Без названия'}</h3>
                    <span className={'status-pill status-' + level.status}>{STATUS_LABEL[level.status]}</span>
                  </div>
                  <p className="level-card-desc">{level.description || 'Без описания'}</p>
                  <div className="level-card-meta">
                    <span>ID: {level.id}</span>
                    <span>Сложность: {DIFFICULTY_LABEL[level.difficulty] || level.difficulty}</span>
                    <span>Ходов: {level.steps.length}</span>
                  </div>
                  <div className="level-card-meta">
                    <span>Создан: {formatDate(level.createdAt)}</span>
                    <span>Изменён: {formatDate(level.updatedAt)}</span>
                  </div>
                  <div className="level-card-actions">
                    <button type="button" className="panel-button ghost" onClick={() => onEditTask(level.id)}>Редактировать</button>
                    {level.status === 'published'
                      ? <button type="button" className="panel-button ghost" onClick={() => setStatus(level, 'archived')}>Снять с публикации</button>
                      : <button type="button" className="panel-button dark" onClick={() => setStatus(level, 'published')}>Опубликовать</button>}
                    <button type="button" className="panel-button ghost danger" onClick={() => remove(level)}>Удалить</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}
