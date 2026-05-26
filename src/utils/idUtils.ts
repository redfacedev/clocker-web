export function generateProjectId(name: string): string {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${sanitized}_${Date.now()}_${random}`;
}

export function generateTagId(): string {
  return `tag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
