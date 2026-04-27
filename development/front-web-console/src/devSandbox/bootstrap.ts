import { isLocalSandboxMode } from './mode';
import { installFetchMock } from './installFetchMock';

export async function shouldEnableLocalSandbox(mode = import.meta.env.MODE): Promise<boolean> {
  return isLocalSandboxMode(mode);
}

let uninstallFetchMock: (() => void) | null = null;

export async function bootstrapLocalSandbox(mode = import.meta.env.MODE): Promise<void> {
  const shouldEnable = await shouldEnableLocalSandbox(mode);
  if (!shouldEnable) {
    return;
  }

  uninstallFetchMock?.();
  uninstallFetchMock = installFetchMock();
}
