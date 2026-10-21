// Tells the user when a new version is waiting or has just been installed.
// Chrome updates extensions on its own; this only surfaces it (badge + popup
// banner) and lets the user apply a downloaded update at a safe moment. It makes
// no network request of its own: it relies on Chrome's built-in update check.
export const CHANGELOG_URL = 'https://github.com/msmahdinejad/avorythm/blob/main/CHANGELOG.md';
const WHATS_NEW_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function versionParts(version) {
  return String(version || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
}

export function isNewerVersion(candidate, current) {
  const left = versionParts(candidate);
  const right = versionParts(current);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference) return difference > 0;
  }
  return false;
}

export function createUpdateNotice(chromeApi = globalThis.chrome, now = () => Date.now()) {
  const storage = () => chromeApi.storage.local;
  const currentVersion = () => chromeApi.runtime.getManifest().version;

  async function status() {
    const {pendingUpdate = null, whatsNew = null} = await storage().get(['pendingUpdate', 'whatsNew']);
    const current = currentVersion();
    return {
      current,
      pending: pendingUpdate && isNewerVersion(pendingUpdate.version, current) ? pendingUpdate : null,
      whatsNew: whatsNew && now() - (whatsNew.at || 0) < WHATS_NEW_TTL_MS ? whatsNew : null
    };
  }

  async function paintBadge() {
    const {pending, whatsNew} = await status();
    const text = pending ? '↑' : whatsNew ? 'NEW' : '';
    await chromeApi.action?.setBadgeText?.({text});
    if (text) await chromeApi.action?.setBadgeBackgroundColor?.({color: pending ? '#7561f5' : '#2f9e78'});
  }

  return {
    status,
    paintBadge,

    // Chrome downloaded a new version; it applies on restart or when the user asks.
    async onUpdateAvailable(details) {
      const version = String(details?.version || '');
      if (!version || !isNewerVersion(version, currentVersion())) return;
      await storage().set({pendingUpdate: {version, at: now()}});
      await paintBadge();
    },

    async onInstalled(details) {
      if (details?.reason !== 'update') return;
      await storage().remove('pendingUpdate');
      await storage().set({whatsNew: {version: currentVersion(), previousVersion: details.previousVersion || '', at: now()}});
      await paintBadge();
    },

    // Ask Chrome to look for an update now. Chrome throttles this itself.
    async check() {
      try {
        const result = await chromeApi.runtime.requestUpdateCheck();
        const outcome = Array.isArray(result) ? {status: result[0], version: result[1]?.version} : result;
        return {status: outcome?.status || 'no_update', version: outcome?.version || ''};
      } catch {
        return {status: 'error', version: ''};
      }
    },

    async dismiss() {
      await storage().remove('whatsNew');
      await paintBadge();
    }
  };
}
