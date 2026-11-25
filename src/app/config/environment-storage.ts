const PROJECT_MARKER = 'clinicago:firebase-project';
const APP_PREFIXES = [
  'cliniq-go-',
  'cliniq-sync:',
  'nexus-notifications:',
  'clinicago:',
  'nexus-clinical',
];
// localhost can switch between projects. Do not restore another environment's clinical cache/session.
export function prepareEnvironmentStorage(projectId: string, storage: Storage = localStorage) {
  const previous = storage.getItem(PROJECT_MARKER) || 'clinq-go';
  if (previous !== projectId) {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
    for (const key of keys)
      if (key && APP_PREFIXES.some((prefix) => key.startsWith(prefix))) storage.removeItem(key);
  }
  storage.setItem(PROJECT_MARKER, projectId);
}
