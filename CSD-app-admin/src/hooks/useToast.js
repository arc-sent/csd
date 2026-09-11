// Порт Admin.notify из admins/js/board-common.js: тост с автоскрытием через
// 2400мс.
import { useCallback, useRef, useState } from 'react';

export function useToast() {
  const [message, setMessage] = useState('');
  const timer = useRef(null);

  const notify = useCallback(text => {
    setMessage(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(''), 2400);
  }, []);

  return { message, notify };
}
