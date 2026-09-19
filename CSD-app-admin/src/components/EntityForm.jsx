export default function EntityForm({
  sectionLabel,
  title,
  description,
  fields,
  preview,
  onCancel,
  onSave,
  saveLabel = 'Сохранить',
  cancelLabel = 'Отмена'
}) {
  return (
    <div className="entity-form-screen">
      <div className="section-intro-admin">
        <span className="section-label">{sectionLabel}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="entity-form-layout">
        <div className="entity-form-fields">
          {fields}
          <div className="panel-actions editor-actions">
            <button type="button" className="panel-button ghost" onClick={onCancel}>{cancelLabel}</button>
            <button type="button" className="panel-button dark" onClick={onSave}>{saveLabel}</button>
          </div>
        </div>
        <div className="entity-form-preview">
          <span className="field-label">Предпросмотр карточки</span>
          {preview}
        </div>
      </div>
    </div>
  );
}
