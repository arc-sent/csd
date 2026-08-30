export const container = 'w-[min(100%-28px,1180px)] sm:w-[min(1180px,calc(100%-40px))] mx-auto';
export const sectionPad = 'py-[74px] sm:py-[104px]';
export const label = 'text-[12px] tracking-[.16em] uppercase font-extrabold';
export const heading =
  'font-display text-[39px] sm:text-[clamp(36px,4.5vw,60px)] leading-[.98] tracking-[-.06em] mt-[11px] mb-0 max-w-[820px]';

const buttonBase =
  'inline-flex items-center justify-center gap-3 min-h-[52px] px-[22px] rounded-[15px] text-sm font-extrabold transition duration-200 hover:-translate-y-0.5';

export function Button({variant = 'primary', className = '', children, ...rest}) {
  const styles = {
    primary: 'bg-accent text-white shadow-[0_12px_24px_rgba(255,107,45,.22)]',
    dark: 'bg-ink text-white',
    outline: 'border border-[#bdb9b0] hover:border-ink hover:bg-white',
    small: 'bg-ink text-white min-h-[42px] px-4 rounded-xl text-xs'
  }[variant];
  return (
    <a className={`${buttonBase} ${styles} ${className}`} {...rest}>
      {children}
    </a>
  );
}

/** Заголовок секции: слева название и подзаголовок, справа пояснение. */
export function SectionIntro({label: labelText, title, note, split = false, className = ''}) {
  return (
    <div
      className={[
        'grid items-start mb-[50px]',
        split
          ? 'grid-cols-1 gap-[22px] lg:grid-cols-[1fr_360px] lg:gap-[70px]'
          : 'grid-cols-1 gap-[14px] sm:gap-[22px]',
        className
      ].join(' ')}
    >
      <div>
        <span className={`${label} text-muted`}>{labelText}</span>
        <h2 className={heading}>{title}</h2>
      </div>
      {note && (
        <p className="text-muted text-sm leading-[1.7] m-0 lg:pt-[30px]">{note}</p>
      )}
    </div>
  );
}
