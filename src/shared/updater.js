import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { emit, listen } from '@tauri-apps/api/event';

let readyUpdate = null;

/**
 * Checks for a signed update without surfacing network or signature failures.
 * The caller receives a confirmation callback only after the package has been
 * downloaded and verified by the updater plugin.
 */
export async function checkForAppUpdate({ onReady } = {}) {
  try {
    const update = await check();
    if (!update?.available) return false;

    await update.download();
    readyUpdate = update;
    await emit('update-ready', { version: update.version });
    if (typeof onReady === 'function') {
      onReady({ version: update.version, body: update.body || '' });
    }
    return true;
  } catch {
    // Update checks run in the background and must never affect monitoring.
    return false;
  }
}

/**
 * Relaunches after the user confirms an already downloaded signed update.
 */
export async function installReadyUpdate() {
  try {
    if (!readyUpdate) return false;
    await readyUpdate.install();
    await relaunch();
    return true;
  } catch {
    return false;
  }
}

/** Registers the tray confirmation event and returns its cleanup function. */
export async function listenForUpdateInstall() {
  return listen('update-install-requested', async () => {
    await installReadyUpdate();
  });
}
