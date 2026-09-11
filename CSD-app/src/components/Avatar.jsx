// Кружок с инициалом email — тот же приём, что уже был в блоке отзывов
// (Sections.jsx, REVIEWS), вынесен в переиспользуемый компонент: у почтовых
// провайдеров нет публичного API для аватарки, а у большинства покупателей
// там всё равно ничего не загружено.
export function Avatar({email, size = 34, className = ''}) {
  const letter = (email?.trim()?.[0] || '?').toUpperCase();
  return (
    <span
      className={`grid place-items-center rounded-full bg-paper font-extrabold text-ink shrink-0 ${className}`}
      style={{width: size, height: size, fontSize: size * 0.4}}
    >
      {letter}
    </span>
  );
}
