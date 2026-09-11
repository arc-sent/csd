// Общий каркас списка: шапка+счётчик+кнопка создания, тулбар поиска/фильтров,
// пустое состояние, сетка карточек. Порт общего паттерна admins/js/stages.js,
// admins/js/assignments.js, admins/js/levels.js.
export default function EntityListView({
  breadcrumb,
  sectionLabel,
  title,
  count,
  onCreate,
  createLabel,
  toolbar,
  toolbarClassName = 'levels-toolbar entity-toolbar',
  items,
  renderCard,
  emptyText
}) {
  return (
    <div className="entity-list">
      {breadcrumb}
      <div className="admin-view-head">
        <div>
          <span className="section-label">{sectionLabel}</span>
          <h2>{title} <span className="muted-count">{count}</span></h2>
        </div>
        {onCreate && (
          <button type="button" className="button button-primary" onClick={onCreate}>{createLabel}</button>
        )}
      </div>

      <div className={toolbarClassName}>{toolbar}</div>

      {items.length === 0
        ? <p className="empty-state" style={{ display: 'block' }}>{emptyText}</p>
        : <div className="levels-grid entity-grid">{items.map(renderCard)}</div>}
    </div>
  );
}
