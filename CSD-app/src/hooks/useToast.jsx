import {createContext, useCallback, useContext, useRef, useState} from 'react';

// Раньше тост жил прямо в App.jsx и был доступен только Demo и Plans. Кабинету
// он тоже нужен, поэтому переехал в провайдер. Разметка и тайминг (2200 мс,
// один сбрасываемый таймер) сохранены один в один.
const ToastContext = createContext(null);

export function ToastProvider({children}) {
  const [toast, setToast] = useState('');
  const timer = useRef(null);

  const notify = useCallback(message => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(''), 2200);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        className={`fixed right-5 bottom-5 z-[100] rounded-xl bg-invert text-invert-fg px-4 py-3 text-[11px] transition duration-250 ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5 pointer-events-none'
        }`}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast вызван вне ToastProvider');
  return notify;
}
