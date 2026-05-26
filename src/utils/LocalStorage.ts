import { IconId, Project, Tag, TimeLog } from '../types';
import { DEFAULT_DELETE_PHRASE, DEFAULT_SORT_METHOD } from './SettingsDefaults';

const PROJECTS_KEY = 'clocker_projects';
const LOGS_PREFIX = 'clocker_logs_';
const BACKUPS_PREFIX = 'clocker_backups_';
const DELETE_PHRASE_KEY = 'clocker_delete_phrase';
const SORT_METHOD_KEY = 'clocker_sort_method';

const MAX_BACKUPS_PER_PROJECT = 5;

interface SerializedTimeLog {
  date: string;
  startTime: string;
  endTime: string | null;
  tagId?: string;
}

interface SerializedBackup {
  backupId: string;
  timestamp: string;
  logs: SerializedTimeLog[];
}

function serializeLog(log: TimeLog): SerializedTimeLog {
  return {
    date: log.date.toISOString(),
    startTime: log.startTime.toISOString(),
    endTime: log.endTime ? log.endTime.toISOString() : null,
    ...(log.tagId !== undefined && { tagId: log.tagId }),
  };
}

function deserializeLog(serializedLog: SerializedTimeLog): TimeLog {
  return {
    date: new Date(serializedLog.date),
    startTime: new Date(serializedLog.startTime),
    endTime: serializedLog.endTime ? new Date(serializedLog.endTime) : null,
    tagId: serializedLog.tagId,
  };
}

interface StoredProject {
  id: string;
  name: string;
  description: string;
  icon: IconId;
  active?: boolean;
  starred?: boolean;
  tags?: Tag[];
}

export const LocalStorage = {
  loadProjects(): Project[] {
    const serializedProjects = localStorage.getItem(PROJECTS_KEY);
    if (!serializedProjects) return [];
    return (JSON.parse(serializedProjects) as StoredProject[]).map(project => ({
      ...project,
      active: project.active ?? false,
      starred: project.starred ?? false,
      tags: project.tags ?? [],
    }));
  },

  saveProjects(projects: Project[]): void {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  },

  loadLogs(projectId: string): TimeLog[] {
    const serializedLogs = localStorage.getItem(LOGS_PREFIX + projectId);
    if (!serializedLogs) return [];
    return (JSON.parse(serializedLogs) as SerializedTimeLog[]).map(log => ({
      date: new Date(log.date),
      startTime: new Date(log.startTime),
      endTime: log.endTime ? new Date(log.endTime) : null,
      tagId: log.tagId,
    }));
  },

  saveLogs(projectId: string, logs: TimeLog[]): void {
    localStorage.setItem(LOGS_PREFIX + projectId, JSON.stringify(logs));
  },

  getDeletePhrase(): string {
    return localStorage.getItem(DELETE_PHRASE_KEY) ?? DEFAULT_DELETE_PHRASE;
  },

  setDeletePhrase(phrase: string): void {
    localStorage.setItem(DELETE_PHRASE_KEY, phrase);
  },

  getSortMethod(): string {
    return localStorage.getItem(SORT_METHOD_KEY) ?? DEFAULT_SORT_METHOD;
  },

  setSortMethod(method: string): void {
    localStorage.setItem(SORT_METHOD_KEY, method);
  },

  // ── Backup system ────────────────────────────────────────────────────────────

  createBackup(projectId: string, currentLogs: TimeLog[]): void {
    const key = BACKUPS_PREFIX + projectId;
    const raw = localStorage.getItem(key);
    const existingBackups: SerializedBackup[] = raw ? JSON.parse(raw) : [];

    const newBackup: SerializedBackup = {
      backupId: `backup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      logs: currentLogs.map(serializeLog),
    };

    existingBackups.push(newBackup);
    if (existingBackups.length > MAX_BACKUPS_PER_PROJECT) existingBackups.shift(); // FIFO eviction

    localStorage.setItem(key, JSON.stringify(existingBackups));
  },

  getBackupCount(projectId: string): number {
    const raw = localStorage.getItem(BACKUPS_PREFIX + projectId);
    if (!raw) return 0;
    return (JSON.parse(raw) as SerializedBackup[]).length;
  },

  popLatestBackup(projectId: string): TimeLog[] | null {
    const key = BACKUPS_PREFIX + projectId;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const backups: SerializedBackup[] = JSON.parse(raw);
    if (backups.length === 0) return null;

    const latestBackup = backups.pop()!; // remove most recent — backup is now destroyed
    localStorage.setItem(key, JSON.stringify(backups));
    return latestBackup.logs.map(deserializeLog);
  },

  deleteProjectBackups(projectId: string): void {
    localStorage.removeItem(BACKUPS_PREFIX + projectId);
  },
};
