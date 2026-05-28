import { useState, useRef, useMemo, useLayoutEffect } from 'react';
import type { User } from 'firebase/auth';
import accountCircleIcon from '../assets/account_circle.svg';
import ProjectTile from '../components/ProjectTile';
import ProjectDialog from '../components/ProjectDialog';
import SettingsDialog from '../components/SettingsDialog';
import PhraseConfirmDialog from '../components/PhraseConfirmDialog';
import SignInDialog from '../components/SignInDialog';
import AccountDialog from '../components/AccountDialog';
import { LocalStorage } from '../utils/LocalStorage';
import { getDurationSeconds, isActive } from '../utils/TimeUtils';
import { Project, ProjectFormData } from '../types';
import ActivityCalendar from '../components/ActivityCalendar';
import ProjectTimeBarChart from '../components/ProjectTimeBarChart';
import './DashboardView.css';

const SORT_OPTIONS = [
  { value: 'most-time',    label: 'Most time' },
  { value: 'least-time',   label: 'Least time' },
  { value: 'most-recent',  label: 'Most recent' },
  { value: 'least-recent', label: 'Least recent' },
  { value: 'name-asc',     label: 'Name A–Z' },
  { value: 'name-desc',    label: 'Name Z–A' },
];

interface Props {
  projects: Project[];
  onProjectSelect: (project: Project) => void;
  onAddProject: (data: ProjectFormData) => void;
  onDeleteProjects: (projectIds: string[]) => void;
  onStarProject: (projectId: string) => void;
  user: User | null | undefined;
  onGoogleSignIn: () => void;
  onGithubSignIn: () => void;
  onSignOut: () => void;
  logSyncVersion: number;
}

function DashboardView({ projects, onProjectSelect, onAddProject, onDeleteProjects, onStarProject, user, onGoogleSignIn, onGithubSignIn, onSignOut, logSyncVersion }: Props) {
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [showPhraseConfirm, setShowPhraseConfirm] = useState(false);
  const [sortMethod, setSortMethod] = useState(() => LocalStorage.getSortMethod());
  const gridRef = useRef<HTMLDivElement>(null);
  const prevPositions = useRef<Map<string, DOMRect>>(new Map());

  const projectStats = useMemo(() => {
    return projects.map(project => {
      const logs = LocalStorage.loadLogs(project.id);
      const totalSeconds = logs.reduce((sum, log) => {
        if (isActive(log)) return sum + Math.floor((new Date().getTime() - log.startTime.getTime()) / 1000);
        return sum + getDurationSeconds(log.startTime, log.endTime);
      }, 0);
      const mostRecentDate = logs.reduce((max, log) => {
        const time = log.startTime ? log.startTime.getTime() : 0;
        return time > max ? time : max;
      }, 0);
      return { id: project.id, totalSeconds, mostRecentDate };
    });
  }, [projects, logSyncVersion]);

  const sortedProjects = useMemo(() => {
    const statsMap = new Map(projectStats.map(stats => [stats.id, stats]));
    const comparator = (projectA: Project, projectB: Project) => {
      const statsA = statsMap.get(projectA.id)!;
      const statsB = statsMap.get(projectB.id)!;
      switch (sortMethod) {
        case 'most-time':    return statsB.totalSeconds - statsA.totalSeconds;
        case 'least-time':   return statsA.totalSeconds - statsB.totalSeconds;
        case 'most-recent':  return statsB.mostRecentDate - statsA.mostRecentDate;
        case 'least-recent': return statsA.mostRecentDate - statsB.mostRecentDate;
        case 'name-asc':     return projectA.name.localeCompare(projectB.name);
        case 'name-desc':    return projectB.name.localeCompare(projectA.name);
        default:             return 0;
      }
    };
    const starred = projects.filter(p => p.starred).sort(comparator);
    const unstarred = projects.filter(p => !p.starred).sort(comparator);
    return [...starred, ...unstarred];
  }, [projects, projectStats, sortMethod]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const wrappers = grid.querySelectorAll<HTMLElement>('[data-project-id]');
    const newPositions = new Map<string, DOMRect>();

    wrappers.forEach(el => {
      newPositions.set(el.dataset.projectId!, el.getBoundingClientRect());
    });

    wrappers.forEach(el => {
      const id = el.dataset.projectId!;
      const prev = prevPositions.current.get(id);
      const curr = newPositions.get(id)!;
      if (prev && (Math.abs(prev.left - curr.left) > 0.5 || Math.abs(prev.top - curr.top) > 0.5)) {
        el.animate(
          [
            { transform: `translate(${prev.left - curr.left}px, ${prev.top - curr.top}px)` },
            { transform: 'translate(0px, 0px)' },
          ],
          { duration: 280, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'none' }
        );
      }
    });

    prevPositions.current = newPositions;
  }, [sortedProjects]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortMethod(e.target.value);
    LocalStorage.setSortMethod(e.target.value);
  };

  const toggleSelectMode = () => {
    setSelectMode(current => !current);
    setSelectedIds(new Set());
  };

  const toggleTileSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => setShowPhraseConfirm(true);

  const handlePhraseConfirm = () => {
    onDeleteProjects([...selectedIds]);
    setSelectedIds(new Set());
    setSelectMode(false);
    setShowPhraseConfirm(false);
  };

  const handleTileClick = (project: Project) => {
    if (selectMode) {
      toggleTileSelect(project.id);
      return;
    }
    onProjectSelect(project);
  };

  return (
    <div className="dashboard-view">
      <header className="dashboard-header">
        <h1>Clocker</h1>
        <div className="header-controls">
          <button className="btn-secondary btn-settings" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
          {user === undefined ? null : user
            ? <>
                <button className="btn-secondary btn-auth" onClick={onSignOut}>Sign out</button>
                <button className="btn-secondary btn-account" onClick={() => setShowAccount(true)}>
                  <img src={accountCircleIcon} alt="Account" />
                </button>
              </>
            : <button className="btn-secondary btn-auth" onClick={() => setShowSignIn(true)}>Sign In</button>
          }
        </div>
      </header>

      <div className="main-content">
        <div className="projects-section">
          <div className="projects-container">
            <div className="projects-header">
              <div className="projects-header-left">
                <h2 className="projects-title">My Projects</h2>
                <div className="sort-control">
                  <label className="sort-label" htmlFor="sort-select">Sort:</label>
                  <select id="sort-select" className="sort-select" value={sortMethod} onChange={handleSortChange}>
                    {SORT_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="projects-header-actions">
                {selectMode && selectedIds.size > 0 && (
                  <button className="btn-danger btn-delete-selected" onClick={handleDeleteSelected}>
                    Delete {selectedIds.size} selected
                  </button>
                )}
                <button className={`btn-select ${selectMode ? 'active' : ''}`} onClick={toggleSelectMode}>Select</button>
                <button className="btn-primary" onClick={() => setShowCreateProjectDialog(true)}>+ New Project</button>
              </div>
            </div>
            <div className="projects-grid" ref={gridRef}>
              {sortedProjects.length === 0 ? (
                <div className="empty-state">
                  <p>No projects yet. Create one to get started!</p>
                </div>
              ) : (
                sortedProjects.map(project => (
                  <div key={project.id} data-project-id={project.id}>
                    <ProjectTile
                      project={project}
                      onClick={() => handleTileClick(project)}
                      selectMode={selectMode}
                      selected={selectedIds.has(project.id)}
                      onStarToggle={() => onStarProject(project.id)}
                      logSyncVersion={logSyncVersion}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="projects-container">
            <div className="projects-header">
              <div className="projects-header-left">
                <h2 className="projects-title">Analytics</h2>
              </div>
            </div>
            <div className="analytics-graphs">
              <div className="analytics-graph-card">
                <h3 className="analytics-graph-title">Daily Activity</h3>
                <ActivityCalendar projects={projects} />
              </div>
              <div className="analytics-graph-card">
                <h3 className="analytics-graph-title">Time by Project</h3>
                <ProjectTimeBarChart projects={projects} logSyncVersion={logSyncVersion} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreateProjectDialog && (
        <ProjectDialog
          projects={projects}
          onClose={() => setShowCreateProjectDialog(false)}
          onSubmit={(data) => { onAddProject(data); setShowCreateProjectDialog(false); }}
        />
      )}

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}

      {showSignIn && (
        <SignInDialog
          onGoogleSignIn={() => { setShowSignIn(false); onGoogleSignIn(); }}
          onGithubSignIn={() => { setShowSignIn(false); onGithubSignIn(); }}
          onClose={() => setShowSignIn(false)}
        />
      )}

      {showAccount && user && (
        <AccountDialog user={user} onClose={() => setShowAccount(false)} />
      )}

      {showPhraseConfirm && (
        <PhraseConfirmDialog
          count={selectedIds.size}
          onConfirm={handlePhraseConfirm}
          onCancel={() => setShowPhraseConfirm(false)}
        />
      )}
    </div>
  );
}

export default DashboardView;
