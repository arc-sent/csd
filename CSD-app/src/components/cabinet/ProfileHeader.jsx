import {Avatar} from '../Avatar.jsx';
import {label} from '../ui.jsx';
import {useAuthContext} from '../../context/AuthContext.jsx';

// Показывается только на верхнем уровне кабинета (список заданий), не на
// экранах задания/решения — там уже своя навигация с кнопкой «Назад».
export function ProfileHeader() {
  const {user, logout} = useAuthContext();
  if (!user) return null;

  return (
    <div className="flex items-start gap-4">
      <Avatar email={user.email} size={60} />
      <div className="min-w-0 flex-1">
        <span className={`${label} text-subtle block mb-1.5`}>Личный кабинет</span>
        {/* Раньше почта обрезалась в одну строку (truncate) — на узких
            экранах реальный адрес не помещался, и часть него пропадала за
            многоточием без возможности прочитать. Перенос на вторую строку
            ничего не теряет. */}
        <p className="font-display text-[20px] sm:text-[22px] tracking-[-.03em] leading-tight break-all">
          {user.email}
        </p>
      </div>
      {/* Выход — здесь, а не в шапке: шапка одинакова для всего сайта, а
          «Выйти» имеет смысл только в контексте своего аккаунта. flex-none —
          кнопка не должна сжиматься, если почта длинная и переносится. */}
      <button
        type="button"
        onClick={logout}
        className="flex-none mt-1 inline-flex items-center min-h-[38px] px-4 rounded-full border border-line text-[12px] font-bold text-muted transition duration-200 hover:-translate-y-0.5 hover:border-ink hover:text-ink"
      >
        Выйти
      </button>
    </div>
  );
}
