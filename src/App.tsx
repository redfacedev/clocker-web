import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import './App.css';
import DashboardView from './views/DashboardView';
import DetailView from './views/DetailView';
import { LocalStorage } from './utils/LocalStorage';
import { AppStorage } from './utils/Storage';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, githubProvider } from './firebase';
import { AppSnapshot, AppView, Project, ProjectFormData, StoredBackup, Tag } from './types';
import { generateProjectId } from './utils/idUtils';

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>(() => LocalStorage.loadProjects());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [logSyncVersion, setLogSyncVersion] = useState(0);
  const [backup, setBackup] = useState<StoredBackup | null>(null);

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('project-detail');
  };

  const handleBack = () => {
    setCurrentView('dashboard');
    setSelectedProject(null);
  };

  const handleAddProject = (formData: ProjectFormData) => {
    let newProject: Project = {
      ...formData,
      id: formData.id ?? generateProjectId(formData.name),
      active: false,
      starred: false,
      tags: [],
    };

    const baseId = newProject.id;
    let suffix = 1;
    while (projects.some(existing => existing.id === newProject.id)) {
      newProject = { ...newProject, id: `${baseId}_${++suffix}` };
    }

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    AppStorage.saveProjects(updatedProjects);
  };

  const handleEditProject = (formData: ProjectFormData) => {
    const index = projects.findIndex(project => project.id === formData.id);
    if (index >= 0) {
      const updatedProject: Project = { ...projects[index], ...formData, id: projects[index].id };
      const updatedProjects = [...projects];
      updatedProjects[index] = updatedProject;
      setProjects(updatedProjects);
      setSelectedProject(updatedProject);
      AppStorage.saveProjects(updatedProjects);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter(project => project.id !== projectId);
    setProjects(updatedProjects);
    AppStorage.saveProjects(updatedProjects);
    setSelectedProject(null);
    setCurrentView('dashboard');
  };

  const handleActiveChange = (projectId: string, active: boolean) => {
    const updatedProjects = projects.map(project =>
      project.id === projectId ? { ...project, active } : project
    );
    setProjects(updatedProjects);
    if (selectedProject?.id === projectId) setSelectedProject(prev => prev ? { ...prev, active } : prev);
    AppStorage.saveProjects(updatedProjects);
  };

  const handleStarProject = (projectId: string) => {
    const updatedProjects = projects.map(project =>
      project.id === projectId ? { ...project, starred: !project.starred } : project
    );
    setProjects(updatedProjects);
    AppStorage.saveProjects(updatedProjects);
  };

  const handleTagsChange = (projectId: string, tags: Tag[]) => {
    const updatedProjects = projects.map(project =>
      project.id === projectId ? { ...project, tags } : project
    );
    setProjects(updatedProjects);
    if (selectedProject?.id === projectId) setSelectedProject(prev => prev ? { ...prev, tags } : prev);
    AppStorage.saveProjects(updatedProjects);
  };

  const captureCurrentSnapshot = useCallback((): AppSnapshot => ({
    projects,
    logs: Object.fromEntries(projects.map(p => [p.id, LocalStorage.loadLogs(p.id)])),
  }), [projects]);

  const handleBeforeLogMutation = useCallback(() => {
    const newBackup: StoredBackup = { snapshot: captureCurrentSnapshot(), isFuture: false };
    setBackup(newBackup);
    AppStorage.saveBackup(newBackup);
  }, [captureCurrentSnapshot]);

  const handleBackupAction = useCallback(async () => {
    if (!backup) return;
    const currentSnapshot = captureCurrentSnapshot();
    const targetSnapshot = backup.snapshot;
    const newBackup: StoredBackup = { snapshot: currentSnapshot, isFuture: !backup.isFuture };
    setBackup(newBackup);
    await AppStorage.saveBackup(newBackup);
    await AppStorage.saveProjects(targetSnapshot.projects);
    setProjects(targetSnapshot.projects);
    await Promise.all(
      Object.entries(targetSnapshot.logs).map(([id, logs]) => AppStorage.saveLogs(id, logs))
    );
    setLogSyncVersion(v => v + 1);
  }, [backup, captureCurrentSnapshot]);

  const handleGoogleSignIn = () => signInWithPopup(auth, googleProvider);
  const handleGithubSignIn = () => signInWithPopup(auth, githubProvider);
  const handleSignOut = () => signOut(auth);

  useEffect(() => {
    AppStorage.loadBackup().then(setBackup);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const loadedProjects = await AppStorage.loadProjects();
        setProjects(loadedProjects);
        LocalStorage.saveProjects(loadedProjects);
        await AppStorage.syncAllLogs(loadedProjects.map(project => project.id));
        setLogSyncVersion(v => v + 1);
        const loadedBackup = await AppStorage.loadBackup();
        setBackup(loadedBackup);
      }
    });
  }, []);

  return (
    <div className="app">
      {currentView === 'dashboard' ? (
        <DashboardView
          projects={projects}
          onProjectSelect={handleProjectSelect}
          onAddProject={handleAddProject}
          onStarProject={handleStarProject}
          user={user}
          onGoogleSignIn={handleGoogleSignIn}
          onGithubSignIn={handleGithubSignIn}
          onSignOut={handleSignOut}
          logSyncVersion={logSyncVersion}
          backup={backup}
          onBackupAction={handleBackupAction}
        />
      ) : selectedProject && (
        <DetailView
          project={selectedProject}
          projects={projects}
          onBack={handleBack}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
          onActiveChange={(active) => handleActiveChange(selectedProject.id, active)}
          onTagsChange={handleTagsChange}
          onBeforeLogMutation={handleBeforeLogMutation}
        />
      )}
    </div>
  );
}

export default App;
