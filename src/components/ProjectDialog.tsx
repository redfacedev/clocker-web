import { useState, useRef } from 'react';
import IconSelector from './IconSelector';
import { ICON_IDS, IconId, Project, ProjectFormData } from '../types';
import './ProjectDialog.css';

const NAME_FIRST = [
  'Client', 'Admin', 'Analytics', 'Internal', 'Core', 'Cloud',
  'Smart', 'Rapid', 'Open', 'Edge', 'Budget', 'Auth',
  'Data', 'Task', 'Report', 'User', 'Invoice', 'Legacy',
  'Dark', 'Pixel', 'Indie', 'Retro', 'Neon', 'Cyber',
  'Space', 'Tiny', 'Rogue', 'Cursed', 'Haunted', 'Epic',
];
const NAME_SECOND = [
  'Dashboard', 'Portal', 'Tracker', 'Manager', 'API',
  'Service', 'Tool', 'Monitor', 'Hub', 'Engine',
  'Scanner', 'Builder', 'Gateway', 'Platform', 'Bot',
  'Suite', 'CLI', 'App', 'System', 'Pipeline',
  'Game', 'Adventure', 'Horror', 'RPG', 'Platformer',
  'Dungeon', 'Simulator', 'Shooter', 'Puzzle', 'Quest',
];

const SUGGESTION_LIBRARY = {
  language: ['C#', 'Java', 'Python', 'TypeScript', 'Go', 'Rust', 'Kotlin', 'Swift', 'PHP', 'Ruby', 'Node.js', 'React', 'Vue', 'Unity', 'Unreal', 'Godot', 'OpenGL', 'WebGL'],
  type:     ['API', 'CLI', 'dashboard', 'microservice', 'library', 'plugin', 'web app', 'mobile app', 'bot', 'service', 'game', 'engine', 'mod', 'level editor'],
  task:     ['invoicing', 'scheduling', 'reporting', 'onboarding', 'authentication', 'deployment', 'monitoring', 'billing', 'inventory', 'payroll', 'compliance', 'data sync', 'file uploads', 'notifications', 'pathfinding', 'collision detection', 'procedural generation', 'save states', 'shader rendering', 'AI behaviour'],
  task2:    ['reporting', 'user management', 'access control', 'audit logging', 'rate limiting', 'caching', 'search', 'exports', 'leaderboards', 'physics simulation', 'animation blending', 'particle effects'],
  team:     ['the ops team', 'the sales team', 'the client', 'internal teams', 'enterprise customers', 'the dev team', 'stakeholders', 'end users', 'the finance team', 'a solo dev', 'a small indie team'],
  deadline: ['Q4', 'the next sprint', 'the audit', 'the launch', 'the migration', 'go-live', 'the demo', 'the game jam'],
  industry: ['healthcare', 'fintech', 'e-commerce', 'logistics', 'SaaS', 'retail', 'enterprise', 'indie gaming', 'mobile gaming'],
  legacy:   ['aging', 'spaghetti', 'unmaintained', 'brittle', 'legacy', 'monolithic', 'undocumented'],
  adjective: ['lightweight', 'scalable', 'internal', 'client-facing', 'automated', 'real-time', 'self-hosted', '2D', '3D', 'top-down', 'side-scrolling', 'isometric', 'multiplayer'],
};

const DESC_TEMPLATES: (() => string)[] = [
  () => `A ${pick(SUGGESTION_LIBRARY.language)} ${pick(SUGGESTION_LIBRARY.type)} for managing ${pick(SUGGESTION_LIBRARY.task)} across ${pick(SUGGESTION_LIBRARY.team)}.`,
  () => `${pick(SUGGESTION_LIBRARY.adjective)} ${pick(SUGGESTION_LIBRARY.type)} for ${pick(SUGGESTION_LIBRARY.team)} to handle ${pick(SUGGESTION_LIBRARY.task)} and ${pick(SUGGESTION_LIBRARY.task2)}.`,
  () => `Internal ${pick(SUGGESTION_LIBRARY.language)}/${pick(SUGGESTION_LIBRARY.language)} service for ${pick(SUGGESTION_LIBRARY.task)} and ${pick(SUGGESTION_LIBRARY.task2)}.`,
  () => `Refactoring the ${pick(SUGGESTION_LIBRARY.legacy)} ${pick(SUGGESTION_LIBRARY.type)} before ${pick(SUGGESTION_LIBRARY.deadline)}.`,
  () => `Client-facing ${pick(SUGGESTION_LIBRARY.language)} ${pick(SUGGESTION_LIBRARY.type)} for ${pick(SUGGESTION_LIBRARY.industry)} ${pick(SUGGESTION_LIBRARY.task)}.`,
  () => `Migrating ${pick(SUGGESTION_LIBRARY.task)} from ${pick(SUGGESTION_LIBRARY.language)} to ${pick(SUGGESTION_LIBRARY.language)}.`,
  () => `${pick(SUGGESTION_LIBRARY.task)} automation for ${pick(SUGGESTION_LIBRARY.team)}.`,
  () => `${pick(SUGGESTION_LIBRARY.adjective)} ${pick(SUGGESTION_LIBRARY.language)} ${pick(SUGGESTION_LIBRARY.type)} for ${pick(SUGGESTION_LIBRARY.task)} tracking.`,
  () => `Rebuilding ${pick(SUGGESTION_LIBRARY.task)} before ${pick(SUGGESTION_LIBRARY.deadline)}. ${pick(SUGGESTION_LIBRARY.language)} this time.`,
  () => `${pick(SUGGESTION_LIBRARY.language)} ${pick(SUGGESTION_LIBRARY.type)} handling ${pick(SUGGESTION_LIBRARY.task)} and ${pick(SUGGESTION_LIBRARY.task2)} for ${pick(SUGGESTION_LIBRARY.industry)}.`,
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function luckyName(): string {
  return `${pick(NAME_FIRST)} ${pick(NAME_SECOND)}`;
}

function luckyDescription(): string {
  const result = pick(DESC_TEMPLATES)();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

const NAME_MAX = 44;
const DESCRIPTION_MAX = 95;

interface Props {
  project?: Project;
  projects?: Project[];
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
}

function ProjectDialog({ project, projects = [], onClose, onSubmit }: Props) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [icon, setIcon] = useState<IconId>(project?.icon ?? 'clock');
  const [nameError, setNameError] = useState('');
  const [spinning, setSpinning] = useState(false);
  const spinRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDuplicate = (projectName: string) =>
    projects.some(existing => existing.name.trim().toLowerCase() === projectName.trim().toLowerCase() && existing.id !== project?.id);

  const handleNameChange = (projectName: string) => {
    setName(projectName);
    setNameError(isDuplicate(projectName) ? 'A project with this name already exists.' : '');
  };

  const nameCharsOver = name.length - NAME_MAX;
  const descriptionCharsOver = description.length - DESCRIPTION_MAX;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isDuplicate(name)) { setNameError('A project with this name already exists.'); return; }
    if (nameCharsOver > 0 || descriptionCharsOver > 0) return;
    onSubmit({ id: project?.id, name, description, icon });
  };

  const handleLucky = () => {
    if (spinning) return;

    let finalName = luckyName();
    let attempts = 0;
    while (isDuplicate(finalName) && attempts < 20) { finalName = luckyName(); attempts++; }
    const finalDescription = luckyDescription();
    const finalIcon = pick(ICON_IDS);

    const duration = 1000 + Math.random() * 1000;
    const extraCycles = 3 + Math.floor(Math.random() * 3);
    const start = performance.now();
    let slowCyclesLeft = extraCycles;
    setSpinning(true);
    setNameError('');

    const spin = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const interval = 60 + progress * 160;

      setName(luckyName());
      setDescription(luckyDescription());
      setIcon(pick(ICON_IDS));

      if (progress < 1) {
        spinRef.current = setTimeout(() => spin(performance.now()), interval);
      } else if (slowCyclesLeft > 0) {
        slowCyclesLeft--;
        spinRef.current = setTimeout(() => spin(performance.now()), 220);
      } else {
        setName(finalName);
        setDescription(finalDescription);
        setIcon(finalIcon);
        setSpinning(false);
      }
    };

    spinRef.current = setTimeout(() => spin(performance.now()), 60);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{project ? 'Edit Project' : 'New Project'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="field-label-row">
              <label>Name</label>
              <span className={`char-counter ${nameCharsOver > 0 ? 'over' : nameCharsOver > -10 ? 'near' : ''}`}>
                {nameCharsOver > 0 ? `-${nameCharsOver}` : NAME_MAX - name.length}
              </span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Project name"
              autoFocus
              className={nameCharsOver > 0 || nameError ? 'input-over' : ''}
            />
            {nameError && <p className="field-error">{nameError}</p>}
          </div>

          <div className="form-group">
            <div className="field-label-row">
              <label>Description</label>
              <span className={`char-counter ${descriptionCharsOver > 0 ? 'over' : descriptionCharsOver > -10 ? 'near' : ''}`}>
                {descriptionCharsOver > 0 ? `-${descriptionCharsOver}` : DESCRIPTION_MAX - description.length}
              </span>
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className={descriptionCharsOver > 0 ? 'input-over' : ''}
            />
          </div>

          <div className="form-group">
            <label>Icon</label>
            <IconSelector selectedIcon={icon} onSelect={setIcon} />
          </div>

          <div className="dialog-buttons">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!!nameError || !name.trim() || spinning || nameCharsOver > 0 || descriptionCharsOver > 0}
            >
              {project ? 'Save' : 'Create'}
            </button>
          </div>

          {!project && !name && !description && (
            <div className="lucky-row">
              <div className="lucky-border-wrap">
                <button type="button" className="btn-lucky" onClick={handleLucky} disabled={spinning}>
                  {spinning ? 'Feeling lucky...' : "I'm Feeling Lucky!"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default ProjectDialog;
