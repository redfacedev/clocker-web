import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ICON_IDS, IconId, Project, StoredBackup, Tag, TimeLog } from '../types';

interface FirestoreProject {
  id: string;
  title: string;
  description: string;
  icon: number;
  active: boolean;
  starred: boolean;
  tags?: Tag[];
}

interface FirestoreTimeLog {
  date: string;
  startTime: string;
  endTime: string | null;
  tagId?: string;
}

function toFirestoreProject(localProject: Project): FirestoreProject {
  return {
    id: localProject.id,
    title: localProject.name,
    description: localProject.description,
    icon: Math.max(0, ICON_IDS.indexOf(localProject.icon as IconId)),
    active: localProject.active,
    starred: localProject.starred,
    tags: localProject.tags,
  };
}

function fromFirestoreProject(firestoreProject: FirestoreProject): Project {
  return {
    id: firestoreProject.id,
    name: firestoreProject.title,
    description: firestoreProject.description,
    icon: ICON_IDS[firestoreProject.icon] ?? 'clock',
    active: firestoreProject.active ?? false,
    starred: firestoreProject.starred ?? false,
    tags: firestoreProject.tags ?? [],
  };
}

function toFirestoreLog(log: TimeLog): FirestoreTimeLog {
  return {
    date: log.date.toISOString(),
    startTime: log.startTime.toISOString(),
    endTime: log.endTime?.toISOString() ?? null,
    ...(log.tagId !== undefined && { tagId: log.tagId }),
  };
}

function fromFirestoreLog(firestoreLog: FirestoreTimeLog): TimeLog {
  return {
    date: new Date(firestoreLog.date),
    startTime: new Date(firestoreLog.startTime),
    endTime: firestoreLog.endTime ? new Date(firestoreLog.endTime) : null,
    tagId: firestoreLog.tagId,
  };
}

interface FirestoreBackup {
  projects: FirestoreProject[];
  logs: Record<string, FirestoreTimeLog[]>;
  isFuture: boolean;
}

export const CloudStorage = {
  async loadProjects(userId: string): Promise<Project[] | null> {
    const snapshot = await getDoc(doc(db, 'users', userId));
    const userData = snapshot.exists() ? snapshot.data() : null;
    if (!userData?.projects) return null;
    return (userData.projects as FirestoreProject[]).map(fromFirestoreProject);
  },

  async saveProjects(userId: string, projects: Project[]): Promise<void> {
    await setDoc(doc(db, 'users', userId), { projects: projects.map(toFirestoreProject) }, { merge: true });
  },

  async loadLogs(userId: string, projectId: string): Promise<TimeLog[] | null> {
    const snapshot = await getDoc(doc(db, 'users', userId, 'logs', projectId));
    if (!snapshot.exists()) return null;
    return (snapshot.data().entries as FirestoreTimeLog[]).map(fromFirestoreLog);
  },

  async saveLogs(userId: string, projectId: string, logs: TimeLog[]): Promise<void> {
    await setDoc(doc(db, 'users', userId, 'logs', projectId), { entries: logs.map(toFirestoreLog) });
  },

  async saveBackup(userId: string, backup: StoredBackup): Promise<void> {
    const data: FirestoreBackup = {
      projects: backup.snapshot.projects.map(toFirestoreProject),
      logs: Object.fromEntries(
        Object.entries(backup.snapshot.logs).map(([id, logs]) => [id, logs.map(toFirestoreLog)])
      ),
      isFuture: backup.isFuture,
    };
    await setDoc(doc(db, 'users', userId, 'backup', 'slot'), data);
  },

  async loadBackup(userId: string): Promise<StoredBackup | null> {
    const snap = await getDoc(doc(db, 'users', userId, 'backup', 'slot'));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!Array.isArray(data.projects) || typeof data.logs !== 'object' || data.logs === null) return null;
    return {
      snapshot: {
        projects: (data.projects as FirestoreProject[]).map(fromFirestoreProject),
        logs: Object.fromEntries(
          Object.entries(data.logs as Record<string, FirestoreTimeLog[]>).map(([id, logs]) => [
            id,
            Array.isArray(logs) ? logs.map(fromFirestoreLog) : [],
          ])
        ),
      },
      isFuture: Boolean(data.isFuture),
    };
  },
};
