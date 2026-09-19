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
