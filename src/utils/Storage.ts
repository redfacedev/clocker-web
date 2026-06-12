import { auth } from '../firebase';
import { LocalStorage } from './LocalStorage';
import { CloudStorage } from './CloudStorage';
import { AppSnapshot, Project, StoredBackup, TimeLog } from '../types';

export const AppStorage = {
  async loadProjects(): Promise<Project[]> {
    if (auth.currentUser) {
      const cloudProjects = await CloudStorage.loadProjects(auth.currentUser.uid);
      if (cloudProjects !== null) return cloudProjects;
      // First sign-in: migrate local data to cloud
      const localProjects = LocalStorage.loadProjects();
      await CloudStorage.saveProjects(auth.currentUser.uid, localProjects);
      return localProjects;
    }
    return LocalStorage.loadProjects();
  },

  async saveProjects(projects: Project[]): Promise<void> {
    LocalStorage.saveProjects(projects);
    if (auth.currentUser) {
      await CloudStorage.saveProjects(auth.currentUser.uid, projects);
    }
  },

  async loadLogs(projectId: string): Promise<TimeLog[]> {
    if (auth.currentUser) {
      const cloudLogs = await CloudStorage.loadLogs(auth.currentUser.uid, projectId);
      if (cloudLogs !== null) {
        LocalStorage.saveLogs(projectId, cloudLogs);
        return cloudLogs;
      }
      // First time this project's logs are accessed: migrate local logs to cloud
      const localLogs = LocalStorage.loadLogs(projectId);
      await CloudStorage.saveLogs(auth.currentUser.uid, projectId, localLogs);
      return localLogs;
    }
    return LocalStorage.loadLogs(projectId);
  },

  async saveLogs(projectId: string, logs: TimeLog[]): Promise<void> {
    LocalStorage.saveLogs(projectId, logs);
    if (auth.currentUser) {
      await CloudStorage.saveLogs(auth.currentUser.uid, projectId, logs);
    }
  },

  async syncAllLogs(projectIds: string[]): Promise<void> {
    if (!auth.currentUser) return;
    await Promise.all(projectIds.map(projectId => this.loadLogs(projectId)));
  },

  async exportSnapshot(): Promise<AppSnapshot> {
    const projects = await this.loadProjects();
    const logEntries = await Promise.all(
      projects.map(async project => [project.id, await this.loadLogs(project.id)] as const)
    );
    return { projects, logs: Object.fromEntries(logEntries) };
  },

  async importSnapshot(snapshot: AppSnapshot): Promise<void> {
    await this.saveProjects(snapshot.projects);
    await Promise.all(
      Object.entries(snapshot.logs).map(([projectId, logs]) => this.saveLogs(projectId, logs))
    );
  },

  async saveBackup(backup: StoredBackup): Promise<void> {
    LocalStorage.saveBackup(backup);
    if (auth.currentUser) {
      await CloudStorage.saveBackup(auth.currentUser.uid, backup);
    }
  },

  async loadBackup(): Promise<StoredBackup | null> {
    if (auth.currentUser) {
      try {
        return await CloudStorage.loadBackup(auth.currentUser.uid);
      } catch {
        return null;
      }
    }
    return LocalStorage.loadBackup();
  },
};
