import { useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useToast } from './hooks/useToast.js';
import LoginView from './components/LoginView.jsx';
import Toast from './components/Toast.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import StagesView from './components/StagesView.jsx';
import AssignmentsView from './components/AssignmentsView.jsx';
import LevelsView from './components/LevelsView.jsx';
import PaymentsView from './components/PaymentsView.jsx';
import UsersView from './components/UsersView.jsx';
import TaskEditorFlow from './components/taskEditor/TaskEditorFlow.jsx';

export default function App() {
  const { status, loginError, login, logout } = useAuth();
  const { message, notify } = useToast();
  const [view, setView] = useState('stages'); // 'stages' | 'assignments' | 'levels' | 'payments' | 'users'
  const [currentStage, setCurrentStage] = useState(null);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  // {assignmentId, levelId} | null — редактор задачи рисуется поверх обычных
  // экранов как отдельная мини-иерархия .admin-main/.admin-view (свой степпер
  // Позиция→Решение→Проверка), а не вложенно внутри "Задач", иначе бы
  // .admin-main/.container задваивались и анимация смены шага не проигрывалась.
  const [taskEditor, setTaskEditor] = useState(null);

  function openStage(stage) {
    setCurrentStage(stage);
    setView('assignments');
  }
  function openAssignment(assignment) {
    setCurrentAssignment(assignment);
    setView('levels');
  }
  function backToStages() {
    setCurrentStage(null);
    setView('stages');
  }
  function backToAssignments() {
    setCurrentAssignment(null);
    setView('assignments');
  }
  // Разделы верхнего уровня. Уход из курса сбрасывает и этап, и задание:
  // вернувшись на «Этапы», пользователь должен увидеть список этапов, а не
  // тот экран, с которого ушёл.
  function openSection(section) {
    setCurrentStage(null);
    setCurrentAssignment(null);
    setView(section);
  }
  const SECTIONS = [['stages', 'Этапы'], ['payments', 'Платежи'], ['users', 'Аккаунты']];
  // Задания и задачи — это всё ещё раздел «Этапы», вкладка должна оставаться
  // подсвеченной, пока мы внутри курса.
  const activeSection = view === 'assignments' || view === 'levels' ? 'stages' : view;

  return (
    <div className="admin-shell">
      <header className="site-header" id="top">
        <div className="container header-inner">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true">♞</span>
            <span className="brand-name">ChessSchool<span>Dinamik</span></span>
          </span>
          {/* Разделы видны только после входа — до него переключать нечего,
              как и «Выйти» рядом. 1:1 порт nav из CSD-app (Header.jsx):
              текстовые ссылки между брендом и правым блоком действий, не
              кнопки-пилюли — здесь то же место, но переключают экраны, а не
              ведут по href. */}
          {status === 'authenticated' && (
            <nav className="header-nav" aria-label="Разделы админки">
              {SECTIONS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={'header-nav-link' + (activeSection === id ? ' active' : '')}
                  aria-current={activeSection === id ? 'page' : undefined}
                  onClick={() => openSection(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
          <div className="header-actions">
            {status === 'authenticated' && (
              <button type="button" className="button button-small button-dark" onClick={logout}>Выйти</button>
            )}
            {/* Вне проверки авторизации: тему должно быть видно и на экране входа. */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {status === 'unauthenticated' && <LoginView onLogin={login} error={loginError} />}

      {status === 'authenticated' && (
        <div id="app-shell">
          {taskEditor ? (
            <TaskEditorFlow
              assignmentId={taskEditor.assignmentId}
              levelId={taskEditor.levelId}
              notify={notify}
              onCancel={() => setTaskEditor(null)}
              onDone={() => setTaskEditor(null)}
            />
          ) : (
            <main className="admin-main">
              {/* key={view} — при смене экрана React перемонтирует секцию, и
                  CSS-анимация admin-view-in проигрывается заново, как и при
                  переключении .active в старой админке. */}
              <section key={view} className="admin-view active">
                <div className="container">
                  {view === 'stages' && <StagesView notify={notify} onOpenStage={openStage} />}
                  {view === 'assignments' && currentStage && (
                    <AssignmentsView stage={currentStage} notify={notify} onBack={backToStages} onOpenAssignment={openAssignment} />
                  )}
                  {view === 'payments' && <PaymentsView notify={notify} />}
                  {view === 'users' && <UsersView notify={notify} />}
                  {view === 'levels' && currentAssignment && (
                    <LevelsView
                      assignment={currentAssignment}
                      notify={notify}
                      onBack={backToAssignments}
                      onCreateTask={() => setTaskEditor({ assignmentId: currentAssignment.id, levelId: null })}
                      onEditTask={levelId => setTaskEditor({ assignmentId: currentAssignment.id, levelId })}
                    />
                  )}
                </div>
              </section>
            </main>
          )}
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
