export const ICON_IDS = [
  'clock', 'code', 'wrench', 'folder', 'chart',
  'game', 'bookmark', 'terminal', 'graduation', 'pencil',
  'swimming', 'backpack', 'book', 'exercise', 'money',
] as const;

export type IconId = (typeof ICON_IDS)[number];

export const TAG_COLORS = [
  { id: 'red',    label: 'Red',    value: '#c05050' },
  { id: 'orange', label: 'Orange', value: '#c07840' },
  { id: 'yellow', label: 'Yellow', value: '#a89030' },
  { id: 'green',  label: 'Green',  value: '#4d8e60' },
  { id: 'teal',   label: 'Teal',   value: '#3d8e8a' },
  { id: 'blue',   label: 'Blue',   value: '#4070b8' },
  { id: 'purple', label: 'Purple', value: '#7858b8' },
  { id: 'pink',   label: 'Pink',   value: '#b04878' },
] as const;

export type TagColorId = (typeof TAG_COLORS)[number]['id'];

export interface Tag {
  id: string;
  name: string;
  color: TagColorId;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  icon: IconId;
  active: boolean;
  starred: boolean;
  tags: Tag[];
}

export interface ProjectFormData {
  id?: string;
  name: string;
  description: string;
  icon: IconId;
}

export interface TimeLog {
  date: Date;
  startTime: Date;
  endTime: Date | null;
  tagId?: string;
}

export type AppView = 'dashboard' | 'project-detail';

export type LogSortColumn = 'date' | 'duration';

export interface AppSnapshot {
  projects: Project[];
  logs: Record<string, TimeLog[]>;
}

export interface StoredBackup {
  snapshot: AppSnapshot;
  isFuture: boolean;
}
