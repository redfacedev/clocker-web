import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import './App.css';
import DashboardView from './views/DashboardView';
import DetailView from './views/DetailView';
import { LocalStorage } from './utils/LocalStorage';
import { AppStorage } from './utils/Storage';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, githubProvider } from './firebase';
import { AppView, Project, ProjectFormData, Tag } from './types';
import { generateProjectId } from './utils/idUtils';

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>(() => LocalStorage.loadProjects());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [logSyncVersion, setLogSyncVersion] = useState(0);

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
    LocalStorage.deleteProjectBackups(projectId);
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

  const handleDeleteProjects = (projectIds: string[]) => {
    const idSet = new Set(projectIds);
    const updatedProjects = projects.filter(project => !idSet.has(project.id));
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

  const handleGoogleSignIn = () => signInWithPopup(auth, googleProvider);
  const handleGithubSignIn = () => signInWithPopup(auth, githubProvider);
  const handleSignOut = () => signOut(auth);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const loadedProjects = await AppStorage.loadProjects();
        setProjects(loadedProjects);
        LocalStorage.saveProjects(loadedProjects);
        await AppStorage.syncAllLogs(loadedProjects.map(project => project.id));
        setLogSyncVersion(v => v + 1);
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
          onDeleteProjects={handleDeleteProjects}
          onStarProject={handleStarProject}
          user={user}
          onGoogleSignIn={handleGoogleSignIn}
          onGithubSignIn={handleGithubSignIn}
          onSignOut={handleSignOut}
          logSyncVersion={logSyncVersion}
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
        />
      )}
    </div>
  );
}

export default App;
