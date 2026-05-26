import { useState, useEffect } from 'react';
import { LocalStorage } from '../utils/LocalStorage';
import { formatDuration, getDurationSeconds, isActive } from '../utils/TimeUtils';
import { Project } from '../types';
import ProjectIcon from './ProjectIcon';
import starUnfilledSvg from '../assets/star_unfilled.svg';
import starFilledSvg from '../assets/star_filled.svg';
import './ProjectTile.css';

interface Props {
  project: Project;
  onClick: () => void;
  selectMode: boolean;
  selected: boolean;
  onStarToggle: () => void;
  logSyncVersion: number;
}

function ProjectTile({ project, onClick, selectMode, selected, onStarToggle, logSyncVersion }: Props) {
  const [baseTotalSeconds, setBaseTotalSeconds] = useState(0);
  const [activeStartTime, setActiveStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const logs = LocalStorage.loadLogs(project.id);
    const activeLog = logs.find(log => isActive(log));
    const base = logs.reduce((sum, log) => isActive(log) ? sum : sum + getDurationSeconds(log.startTime, log.endTime), 0);
    setBaseTotalSeconds(base);
    setActiveStartTime(activeLog ? activeLog.startTime : null);
    setElapsedSeconds(activeLog ? Math.floor((new Date().getTime() - activeLog.startTime.getTime()) / 1000) : 0);
  }, [project.id, logSyncVersion]);

  useEffect(() => {
    if (!activeStartTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((new Date().getTime() - activeStartTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeStartTime]);

  const totalTime = baseTotalSeconds + elapsedSeconds;
  const isClocked = !!activeStartTime;

  const classes = ['project-tile', selected ? 'selected' : ''].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
    >
      {selectMode ? (
        <div className={`tile-checkbox${selected ? ' checked' : ''}`}>
          {selected && <span>✓</span>}
        </div>
      ) : (
        <button
          className={`tile-star${project.starred ? ' starred' : ''}`}
          onClick={(e) => { e.stopPropagation(); onStarToggle(); }}
        >
          <img src={project.starred ? starFilledSvg : starUnfilledSvg} alt="Star" />
        </button>
      )}
      <div className="tile-icon">
        <ProjectIcon iconId={project.icon} className="icon-img" />
      </div>
      <div className="tile-content">
        <h3>{project.name}</h3>
        {project.description
          ? <p>{project.description}</p>
          : <p className="no-description">No description</p>
        }
      </div>
      <div className="tile-footer">
        <span className="tile-time">{formatDuration(totalTime)}</span>
        {isClocked && <span className="tile-badge">Active</span>}
      </div>
    </div>
  );
}

export default ProjectTile;
