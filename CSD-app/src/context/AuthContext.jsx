import {createContext, useContext} from 'react';
import {useAuth} from '../hooks/useAuth.js';

// Авторизация нужна в трёх независимых местах — шапке, блоке тарифов и всём
// кабинете. Без общего контекста каждое из них вызвало бы useAuth() и отправило
// собственный запрос /me.
const AuthContext = createContext(null);

export function AuthProvider({children}) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuthContext вызван вне AuthProvider');
  return value;
}
