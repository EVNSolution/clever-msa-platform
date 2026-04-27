export function isLocalSandboxMode(mode = import.meta.env.MODE): boolean {
  return mode === 'local-sandbox';
}
