import {useCallback, useEffect, useMemo, useState} from 'react';
import {ProfileHeader} from './ProfileHeader.jsx';
import {DashboardHero} from './DashboardHero.jsx';
import {AchievementsCard} from './AchievementsCard.jsx';
import {StageAssignments} from './StageAssignments.jsx';
import {AssignmentLevels} from './AssignmentLevels.jsx';
import {SolveScreen} from './SolveScreen.jsx';
import {SectionIntro, container} from '../ui.jsx';
import {Button} from '../ui.jsx';
import {StageSwitcher} from '../StageSwitcher.jsx';
import {PaymentModal} from '../PaymentModal.jsx';
import {LoadingState} from '../Spinner.jsx';
import {NotFoundPage} from '../NotFoundPage.jsx';
import {
  ApiError,
  fetchAssignmentLevels,
  fetchDashboard,
  fetchMyAssignments,
  fetchPublicStages,
  markAchievementsSeen,
  saveTimeZone
} from '../../lib/api.js';
import {handleApiError} from '../../lib/authError.js';
import {useToast} from '../../hooks/useToast.jsx';

function CabinetEmpty({text}) {
  return (
    <div className="rounded-[22px] border border-dashed border-line bg-paper px-6 py-[60px] text-center">
      <p className="font-display text-[20px] tracking-[-.03em] mb-2">Здесь пока пусто</p>
      <p className="text-[13px] text-faint mb-6">{text}</p>
      <Button variant="primary" href={`${window.location.pathname}#plans`}>
        Выбрать задание <span>→</span>
      </Button>
    </div>
  );
}

export function CabinetPage({route, navigate}) {
  const notify = useToast();
  const [assignments, setAssignments] = useState(null);
  const [levelsData, setLevelsData] = useState(null);
  const [levelsNotFound, setLevelsNotFound] = useState(false);
  const [stages, setStages] = useState(null);
  const [stagesFailed, setStagesFailed] = useState(false);
  const [stageId, setStageId] = useState(null);
  const [paymentAssignment, setPaymentAssignment] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const loadAssignments = useCallback(() => {
    fetchMyAssignments()
      .then(setAssignments)
      .catch(err => {
        setAssignments([]);
        handleApiError(err, notify);
      });
  }, [notify]);

  const loadDashboard = useCallback(() => {
    fetchDashboard()
      .then(setDashboard)
      .catch(err => handleApiError(err, notify));
  }, [notify]);

  useEffect(() => {
    loadAssignments();
    loadDashboard();
  }, [loadAssignments, loadDashboard]);

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone) saveTimeZone(timeZone).catch(() => {});
  }, []);

  useEffect(() => {
    fetchPublicStages()
      .then(setStages)
      .catch(() => setStagesFailed(true));
  }, []);

  useEffect(() => {
    if (!route.assignmentId) {
      setLevelsData(null);
      setLevelsNotFound(false);
      return;
    }
    let cancelled = false;
    setLevelsData(null);
    setLevelsNotFound(false);
    fetchAssignmentLevels(route.assignmentId)
      .then(data => {
        if (!cancelled) setLevelsData(data);
      })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setLevelsNotFound(true);
        } else {
          handleApiError(err, notify);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [route.assignmentId, notify]);

  const markSolvedLocally = useCallback(
    levelId => {
      setLevelsData(prev =>
        prev
          ? {...prev, levels: prev.levels.map(l => (l.id === levelId ? {...l, solved: true} : l))}
          : prev
      );
      loadAssignments();
      loadDashboard();
    },
    [loadAssignments, loadDashboard]
  );

  const goToAssignments = () => navigate({view: 'cabinet'});
  const goToAssignment = assignment => navigate({view: 'cabinet', assignmentId: assignment.id});
  const goToLevel = level =>
    navigate({view: 'cabinet', assignmentId: route.assignmentId, levelId: level.id});

  const ownedById = useMemo(() => new Map((assignments || []).map(a => [a.id, a])), [assignments]);

  const stage = useMemo(() => {
    if (!stages || stages.length === 0) return null;
    const chosen = stageId && stages.find(s => s.id === stageId);
    if (chosen) return chosen;
    const purchasedStageId = assignments && assignments.length > 0 ? assignments[0].stage?.id : null;
    return stages.find(s => s.id === purchasedStageId) || stages[0];
  }, [stages, stageId, assignments]);

  const stageSwitcher =
    stages && stages.length > 1 && stage ? (
      <StageSwitcher stages={stages} value={stage.id} onChange={setStageId} pulse />
    ) : null;

  return (
    <section className="bg-bg pt-9 pb-[74px] sm:pt-12 sm:pb-[104px]">
      <div className={container}>
        {route.levelId && levelsData && (
          <SolveScreen
            levelId={route.levelId}
            siblings={levelsData.levels}
            onBack={() => navigate({view: 'cabinet', assignmentId: route.assignmentId})}
            onOpenLevel={goToLevel}
            onSolvedChange={markSolvedLocally}
          />
        )}

        {route.levelId && !levelsData && !levelsNotFound && <LoadingState text="Загружаем задачу…" />}

        {route.assignmentId && levelsNotFound && (
          <NotFoundPage
            title="Такого задания не существует"
            message="Возможно, ссылка устарела, задание сняли с публикации, или оно вам не принадлежит."
            actionLabel="К моим заданиям"
            onAction={goToAssignments}
          />
        )}

        {!route.levelId && route.assignmentId && levelsData && (
          <AssignmentLevels
            assignment={levelsData.assignment}
            levels={levelsData.levels}
            onOpenLevel={goToLevel}
            onBack={goToAssignments}
          />
        )}

        {!route.levelId && route.assignmentId && !levelsData && !levelsNotFound && (
          <LoadingState text="Загружаем задание…" />
        )}

        {!route.assignmentId && (
          <div className="space-y-10 sm:space-y-12">
            <ProfileHeader />

            {dashboard && (
              <DashboardHero
                dashboard={dashboard}
                hasAssignments={Boolean(assignments && assignments.length > 0)}
                onContinue={() =>
                  dashboard.continue &&
                  navigate({view: 'cabinet', assignmentId: dashboard.continue.assignmentId, levelId: dashboard.continue.levelId})
                }
              />
            )}

            {(assignments === null || stages === null) && !stagesFailed && (
              <LoadingState text="Загружаем ваши задания…" />
            )}

            {stagesFailed && (
              <div>
                <SectionIntro label="Личный кабинет" title="Мои задания" split spacing="mb-7" />
                <p className="text-sm text-muted">Не удалось загрузить этапы — попробуйте обновить страницу.</p>
              </div>
            )}

            {assignments !== null && stages !== null && !stagesFailed && (
              stages.length === 0 ? (
                <div>
                  <SectionIntro label="Личный кабинет" title="Мои задания" split spacing="mb-7" />
                  <CabinetEmpty text="Пока нет ни одного доступного этапа." />
                </div>
              ) : stage && stage.assignments.length > 0 ? (
                <div>
                  <StageAssignments
                    stageName={stage.name}
                    assignments={stage.assignments}
                    owned={ownedById}
                    stats={dashboard && {totalSolved: dashboard.totalSolved, accuracy: dashboard.accuracy}}
                    badge={stageSwitcher}
                    onOpen={goToAssignment}
                    onBuy={setPaymentAssignment}
                  />
                </div>
              ) : (
                <div className="relative z-30">
                  <SectionIntro
                    badge={stageSwitcher}
                    label={stageSwitcher ? undefined : stage ? stage.name : 'Личный кабинет'}
                    title="Мои задания"
                    split
                    spacing="mb-7"
                  />
                  <CabinetEmpty text="В этом этапе пока нет опубликованных заданий." />
                </div>
              )
            )}

            {dashboard && !stagesFailed && (
              <AchievementsCard achievements={dashboard.achievements} onSeen={markAchievementsSeen} />
            )}
          </div>
        )}
      </div>
      <PaymentModal assignment={paymentAssignment} onClose={() => setPaymentAssignment(null)} />
    </section>
  );
}
