import { IconId, Project, StoredBackup, Tag, TimeLog } from '../types';
import { DEFAULT_DELETE_PHRASE, DEFAULT_SORT_METHOD } from './SettingsDefaults';

const PROJECTS_KEY = 'clocker_projects';
const LOGS_PREFIX = 'clocker_logs_';
const BACKUP_KEY = 'clocker_backup';
const DELETE_PHRASE_KEY = 'clocker_delete_phrase';
const SORT_METHOD_KEY = 'clocker_sort_method';

interface SerializedTimeLog {
  date: string;
  startTime: string;
  endTime: string | null;
  tagId?: string;
}

interface SerializedBackupData {
  projects: Project[];
  logs: Record<string, SerializedTimeLog[]>;
  isFuture: boolean;
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

  saveBackup(backup: StoredBackup): void {
    const data: SerializedBackupData = {
      projects: backup.snapshot.projects,
      logs: Object.fromEntries(
        Object.entries(backup.snapshot.logs).map(([id, logs]) => [id, logs.map(serializeLog)])
      ),
      isFuture: backup.isFuture,
    };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
  },

  loadBackup(): StoredBackup | null {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data.projects) || typeof data.logs !== 'object' || data.logs === null) return null;
      return {
        snapshot: {
          projects: (data.projects as StoredProject[]).map(p => ({
            ...p,
            active: p.active ?? false,
            starred: p.starred ?? false,
            tags: p.tags ?? [],
          })),
          logs: Object.fromEntries(
            Object.entries(data.logs as Record<string, SerializedTimeLog[]>).map(([id, logs]) => [
              id,
              Array.isArray(logs) ? logs.map(deserializeLog) : [],
            ])
          ),
        },
        isFuture: Boolean(data.isFuture),
      };
    } catch {
      return null;
    }
  },
};
