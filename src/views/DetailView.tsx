import { useState, useEffect } from 'react';
import { AppStorage } from '../utils/Storage';
import { LocalStorage } from '../utils/LocalStorage';
import { formatDuration, formatTime, formatDate, getDurationSeconds, isActive } from '../utils/TimeUtils';
import TimeLogTable from '../components/TimeLogTable';
import EditLogDialog from '../components/EditLogDialog';
import ProjectDialog from '../components/ProjectDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import CreateTagDialog from '../components/CreateTagDialog';
import ProjectIcon from '../components/ProjectIcon';
import arrowBackIcon from '../assets/arrow_back.svg';
import { LogSortColumn, Project, ProjectFormData, Tag, TAG_COLORS, TimeLog } from '../types';
import { generateTagId } from '../utils/idUtils';
import './DetailView.css';

interface Props {
  project: Project;
  projects?: Project[];
  onBack: () => void;
  onEdit: (data: ProjectFormData) => void;
  onDelete: (projectId: string) => void;
  onActiveChange: (active: boolean) => void;
  onTagsChange: (projectId: string, tags: Tag[]) => void;
}

function DetailView({ project, projects = [], onBack, onEdit, onDelete, onActiveChange, onTagsChange }: Props) {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [showEditLogDialog, setShowEditLogDialog] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
  const [tagTargetLog, setTagTargetLog] = useState<TimeLog | null>(null);
  const [sortColumn, setSortColumn] = useState<LogSortColumn>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [backupCount, setBackupCount] = useState(0);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);

  useEffect(() => {
    AppStorage.loadLogs(project.id).then(loadedLogs => {
      setLogs(loadedLogs);
      syncClockState(loadedLogs);
      setBackupCount(LocalStorage.getBackupCount(project.id));
    });
  }, [project.id]);

  const backupBeforeMutation = (currentLogs: TimeLog[]) => {
    LocalStorage.createBackup(project.id, currentLogs);
    setBackupCount(LocalStorage.getBackupCount(project.id));
  };

  useEffect(() => {
    if (!clockedIn || !clockInTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((new Date().getTime() - clockInTime.getTime()) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [clockedIn, clockInTime]);

  const syncClockState = (logList: TimeLog[]) => {
    const activeLog = logList.find(log => isActive(log));
    if (activeLog) {
      setClockedIn(true);
      setClockInTime(activeLog.startTime);
    } else {
      setClockedIn(false);
      setElapsedSeconds(0);
    }
  };

  const handleClockToggle = () => {
    backupBeforeMutation(logs);
    const now = new Date();
    const updatedLogs = [...logs];

    if (clockedIn) {
      const activeIndex = updatedLogs.findIndex(log => isActive(log));
      if (activeIndex >= 0) updatedLogs[activeIndex] = { ...updatedLogs[activeIndex], endTime: now };
      setClockedIn(false);
      setElapsedSeconds(0);
    } else {
      updatedLogs.push({ date: now, startTime: now, endTime: null });
      setClockedIn(true);
      setClockInTime(now);
    }

    setLogs(updatedLogs);
    AppStorage.saveLogs(project.id, updatedLogs);
    onActiveChange(!clockedIn);
  };

  const handleDeleteRow = (log: TimeLog) => {
    backupBeforeMutation(logs);
    const updatedLogs = logs.filter(existingLog => existingLog !== log);
    setLogs(updatedLogs);
    AppStorage.saveLogs(project.id, updatedLogs);
  };

  const handleEditLogDialogClose = () => {
    setShowEditLogDialog(false);
    setEditingLog(null);
  };

  const handleEditLogDialogSubmit = (submittedLog: TimeLog) => {
    backupBeforeMutation(logs);
    let updatedLogs: TimeLog[];
    if (editingLog) {
      updatedLogs = logs.map(existingLog =>
        existingLog === editingLog ? { ...submittedLog, tagId: editingLog.tagId } : existingLog
      );
    } else {
      updatedLogs = [...logs, submittedLog];
    }
    setLogs(updatedLogs);
    AppStorage.saveLogs(project.id, updatedLogs);
    handleEditLogDialogClose();
  };

  const handleTagChange = (log: TimeLog, tagId: string | null) => {
    backupBeforeMutation(logs);
    const updatedLogs = logs.map(existingLog =>
      existingLog === log ? { ...existingLog, tagId: tagId ?? undefined } : existingLog
    );
    setLogs(updatedLogs);
    AppStorage.saveLogs(project.id, updatedLogs);
  };

  const handleCreateTagOpen = (log: TimeLog) => {
    setTagTargetLog(log);
    setShowCreateTagDialog(true);
  };

  const handleDeleteTag = (tagId: string) => {
    const logsAffected = logs.some(log => log.tagId === tagId);
    if (logsAffected) backupBeforeMutation(logs);
    const updatedTags = project.tags.filter(tag => tag.id !== tagId);
    onTagsChange(project.id, updatedTags);
    const updatedLogs = logs.map(existingLog => existingLog.tagId === tagId ? { ...existingLog, tagId: undefined } : existingLog);
    setLogs(updatedLogs);
    AppStorage.saveLogs(project.id, updatedLogs);
  };

  const handleRollback = () => {
    const restoredLogs = LocalStorage.popLatestBackup(project.id);
    if (!restoredLogs) return;
    setLogs(restoredLogs);
    AppStorage.saveLogs(project.id, restoredLogs);
    syncClockState(restoredLogs);
    setBackupCount(LocalStorage.getBackupCount(project.id));
    setShowRollbackConfirm(false);
  };

  const handleEditTag = (tagId: string, tagData: Omit<Tag, 'id'>) => {
    const updatedTags = project.tags.map(tag => tag.id === tagId ? { ...tag, ...tagData } : tag);
    onTagsChange(project.id, updatedTags);
  };

  const handleCreateTagSubmit = (tagData: Omit<Tag, 'id'>) => {
    const newTag: Tag = { id: generateTagId(), ...tagData };
    const updatedTags = [...project.tags, newTag];
    onTagsChange(project.id, updatedTags);

    if (tagTargetLog) {
      backupBeforeMutation(logs);
      const updatedLogs = logs.map(existingLog =>
        existingLog === tagTargetLog ? { ...existingLog, tagId: newTag.id } : existingLog
      );
      setLogs(updatedLogs);
      AppStorage.saveLogs(project.id, updatedLogs);
    }

    setShowCreateTagDialog(false);
    setTagTargetLog(null);
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Start Time', 'End Time', 'Duration', 'Tag'];
    const rows = logs.map(log => {
      const tag = project.tags.find(projectTag => projectTag.id === log.tagId);
      return [
        formatDate(log.date),
        formatTime(log.startTime),
        log.endTime ? formatTime(log.endTime) : '(Active)',
        formatDuration(getDurationSeconds(log.startTime, log.endTime)),
        tag ? tag.name : '',
      ];
    });
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${project.name}-timelogs.csv`;
    downloadLink.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (column: LogSortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
  };

  const getTotalSeconds = () =>
    logs.reduce((sum, log) => sum + getDurationSeconds(log.startTime, log.endTime), 0);

  const getTagTotals = () => {
    const totals = new Map<string, number>();
    logs.forEach(log => {
      if (log.tagId) {
        totals.set(log.tagId, (totals.get(log.tagId) ?? 0) + getDurationSeconds(log.startTime, log.endTime));
      }
    });
    return project.tags
      .filter(tag => totals.has(tag.id))
      .map(tag => ({ tag, seconds: totals.get(tag.id)! }))
      .sort((a, b) => b.seconds - a.seconds);
  };

  const normalizeToStartOfDay = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const getSortedLogs = (): TimeLog[] => {
    return [...logs].sort((firstLog, secondLog) => {
      if (sortColumn === 'date') {
        const dateDiff = normalizeToStartOfDay(firstLog.date) - normalizeToStartOfDay(secondLog.date);
        if (dateDiff !== 0) return sortOrder === 'asc' ? dateDiff : -dateDiff;
        const startTimeDiff = firstLog.startTime.getTime() - secondLog.startTime.getTime();
        return sortOrder === 'asc' ? startTimeDiff : -startTimeDiff;
      } else {
        const diff = getDurationSeconds(firstLog.startTime, firstLog.endTime) - getDurationSeconds(secondLog.startTime, secondLog.endTime);
        return sortOrder === 'asc' ? diff : -diff;
      }
    });
  };

  return (
    <div className="detail-view">
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}>
          <img src={arrowBackIcon} alt="Back" className="btn-back-icon" />
          Back
        </button>
        <div className="project-info">
          <div className="project-title-row">
            {project.icon && <ProjectIcon iconId={project.icon} className="project-icon-img" />}
            <h1>{project.name}</h1>
          </div>
          {project.description && <p>{project.description}</p>}
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowEditProjectDialog(true)}>Edit</button>
          <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
        </div>
      </div>

      <div className="clock-section">
        <button className={`btn-clock ${clockedIn ? 'active' : ''}`} onClick={handleClockToggle}>
          {clockedIn ? 'Clock Out' : 'Clock In'}
        </button>
        <div className="elapsed">
          <span className="elapsed-label">Elapsed</span>
          <span className="elapsed-time">{formatDuration(elapsedSeconds)}</span>
        </div>
      </div>

      <div className="logs-section">
        <div className="logs-header">
          <h2>Time Logs</h2>
          <div className="logs-actions">
            {backupCount > 0 && (
              <button className="btn-rollback" onClick={() => setShowRollbackConfirm(true)}>
                ↩ Rollback{backupCount > 1 ? ` (${backupCount})` : ''}
              </button>
            )}
            <button className="btn-secondary" onClick={() => { setEditingLog(null); setShowEditLogDialog(true); }}>+ Add Entry</button>
            <button className="btn-secondary" onClick={handleExportCsv}>Export CSV</button>
          </div>
        </div>
        <TimeLogTable
          logs={getSortedLogs()}
          tags={project.tags}
          onEdit={(log) => { setEditingLog(log); setShowEditLogDialog(true); }}
          onDelete={handleDeleteRow}
          onSort={handleSort}
          onTagChange={handleTagChange}
          onCreateTag={handleCreateTagOpen}
          onDeleteTag={handleDeleteTag}
          onEditTag={handleEditTag}
          sortColumn={sortColumn}
          sortOrder={sortOrder}
        />
        <div className="total-section">
          <strong className="total-label">Total: {formatDuration(getTotalSeconds())}</strong>
          <div className="tag-totals-scroll">
            {getTagTotals().map(({ tag, seconds }) => {
              const color = TAG_COLORS.find(colorEntry => colorEntry.id === tag.color)?.value;
              return (
                <div key={tag.id} className="tag-total-card" style={{ borderColor: color }}>
                  <div className="tag-total-name">
                    <span className="tag-total-dot" style={{ backgroundColor: color }} />
                    <span>{tag.name}</span>
                  </div>
                  <div className="tag-total-time">{formatDuration(seconds)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showEditLogDialog && (
        <EditLogDialog log={editingLog} onClose={handleEditLogDialogClose} onSubmit={handleEditLogDialogSubmit} />
      )}

      {showEditProjectDialog && (
        <ProjectDialog
          project={project}
          projects={projects}
          onClose={() => setShowEditProjectDialog(false)}
          onSubmit={(data) => { onEdit(data); setShowEditProjectDialog(false); }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          message={`Delete "${project.name}"?`}
          onConfirm={() => { onDelete(project.id); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showCreateTagDialog && (
        <CreateTagDialog
          onClose={() => { setShowCreateTagDialog(false); setTagTargetLog(null); }}
          onSubmit={handleCreateTagSubmit}
        />
      )}

      {showRollbackConfirm && (
        <ConfirmDialog
          message={`Rollback to previous state?${backupCount > 1 ? ` (${backupCount - 1} backup${backupCount - 1 !== 1 ? 's' : ''} will remain)` : ' This is the last backup.'}`}
          onConfirm={handleRollback}
          onCancel={() => setShowRollbackConfirm(false)}
        />
      )}
    </div>
  );
}

export default DetailView;
