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
import ProfileView from './components/ProfileView.jsx';
import TaskEditorFlow from './components/taskEditor/TaskEditorFlow.jsx';

export default function App() {
  const { status, loginError, login } = useAuth();
  const { message, notify } = useToast();
  const [view, setView] = useState('stages');
  const [currentStage, setCurrentStage] = useState(null);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [taskEditor, setTaskEditor] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
  function openSection(section) {
    setCurrentStage(null);
    setCurrentAssignment(null);
    setView(section);
    setMenuOpen(false);
  }
  const SECTIONS = [['stages', 'Этапы'], ['payments', 'Платежи'], ['users', 'Аккаунты'], ['profile', 'Профиль']];
  const activeSection = view === 'assignments' || view === 'levels' ? 'stages' : view;

  return (
    <div className="admin-shell">
      <header className="site-header" id="top">
        <div className="container header-inner">
          <span className="brand">
            <img className="brand-logo" src="/logo.png" alt="" width="38" height="38" />
            <span className="brand-name">ChessSchool<span>Dinamik</span></span>
          </span>
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
            <ThemeToggle />

            {status === 'authenticated' && (
              <button
                type="button"
                className="nav-toggle"
                aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(v => !v)}
              >
                <span className={'nav-toggle-bar' + (menuOpen ? ' bar-1-open' : '')} />
                <span className={'nav-toggle-bar' + (menuOpen ? ' bar-2-open' : '')} />
                <span className={'nav-toggle-bar' + (menuOpen ? ' bar-3-open' : '')} />
              </button>
            )}
          </div>
        </div>

        {status === 'authenticated' && menuOpen && (
          <div className="container nav-mobile-panel">
            {SECTIONS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={'nav-mobile-link' + (activeSection === id ? ' active' : '')}
                aria-current={activeSection === id ? 'page' : undefined}
                onClick={() => openSection(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
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
              <section key={view} className="admin-view active">
                <div className="container">
                  {view === 'stages' && <StagesView notify={notify} onOpenStage={openStage} />}
                  {view === 'assignments' && currentStage && (
                    <AssignmentsView stage={currentStage} notify={notify} onBack={backToStages} onOpenAssignment={openAssignment} />
                  )}
                  {view === 'payments' && <PaymentsView notify={notify} />}
                  {view === 'users' && <UsersView notify={notify} />}
                  {view === 'profile' && <ProfileView notify={notify} />}
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
