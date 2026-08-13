import {DEFAULT_SETTINGS, LANGUAGES, normalizeSettings, subtitlesEnabled} from './core.mjs';

const OFFSCREEN_PATH = 'offscreen.html';
const defaultState = {
  active: false,
  status: 'idle',
  error: '',
  sourceText: '',
  translatedText: '',
  sourceLanguage: '',
  recordingReady: false,
  captureTabId: null,
  config: null
};

async function injectOverlay(tabId) {
  if (!chrome.scripting?.executeScript) return;
  try {
    await chrome.scripting.executeScript({target: {tabId}, files: ['content.js']});
  } catch {
    throw new Error('subtitle_overlay_unavailable');
  }
}

async function broadcastOverlay(state) {
  if (!state.captureTabId || !chrome.tabs?.sendMessage) return;
  try {
    await chrome.tabs.sendMessage(state.captureTabId, {
      type: 'lingora-overlay',
      active: state.active,
      sourceText: state.sourceText,
      translatedText: state.translatedText,
      settings: state.config || DEFAULT_SETTINGS
    });
  } catch {}
}

async function getState() {
  const stored = await chrome.storage.session.get('state');
  return {...defaultState, ...stored.state};
}

async function setState(update) {
  const state = {...await getState(), ...update};
  await chrome.storage.session.set({state});
  return state;
}

async function hasOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)]
  });
  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['USER_MEDIA'],
    justification: 'Capture and reroute user-selected tab audio for live translation.'
  });
}

async function bootstrap() {
  const [{settings}, {apiKey}] = await Promise.all([
    chrome.storage.local.get('settings'),
    chrome.storage.session.get('apiKey')
  ]);
  return {
    languages: LANGUAGES,
    settings: normalizeSettings(settings),
    api_key_set: Boolean(apiKey)
  };
}

async function start(config) {
  const current = await getState();
  if (current.active) return current;
  if (config?.consentVersion !== 1) throw new Error('consent_required');
  if (config.recording && !await chrome.permissions.contains({permissions: ['downloads']})) {
    throw new Error('downloads_permission_missing');
  }
  const {apiKey} = await chrome.storage.session.get('apiKey');
  if (!apiKey) throw new Error('api_key_missing');
  await ensureOffscreenDocument();
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id) throw new Error('active_tab_missing');
  if (subtitlesEnabled(config)) await injectOverlay(tab.id);
  const streamId = await chrome.tabCapture.getMediaStreamId({targetTabId: tab.id});
  await setState({active: true, status: 'connecting', error: '', sourceText: '', translatedText: '', recordingReady: false, captureTabId: tab.id, config});
  await broadcastOverlay(await getState());
  const response = await chrome.runtime.sendMessage({target: 'offscreen', type: 'start', streamId, config, apiKey});
  if (!response?.ok) {
    if (await hasOffscreenDocument()) await chrome.offscreen.closeDocument();
    const failed = await setState({active: false, status: 'error', error: response?.error || 'capture_failed'});
    await broadcastOverlay(failed);
    await setState({captureTabId: null, config: null});
    throw new Error(response?.error || 'capture_failed');
  }
  return getState();
}

async function stop() {
  const current = await getState();
  let failure = '';
  if (await hasOffscreenDocument()) {
    const response = await chrome.runtime.sendMessage({target: 'offscreen', type: 'stop'});
    await chrome.offscreen.closeDocument();
    if (!response?.ok) failure = response?.error || 'stop_failed';
  }
  const state = await setState({active: false, status: 'idle'});
  await broadcastOverlay({...current, active: false});
  const stopped = await setState({...state, captureTabId: null, config: null});
  if (failure) throw new Error(failure);
  return stopped;
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.session.set({state: defaultState});
  const {settings} = await chrome.storage.local.get('settings');
  if (!settings) await chrome.storage.local.set({settings: DEFAULT_SETTINGS});
  else await chrome.storage.local.set({settings: normalizeSettings(settings)});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen') return false;
  (async () => {
    if (message.target === 'background') {
      if (message.type === 'bridge-state') {
        const state = await setState(message.update);
        await broadcastOverlay(state);
      }
      else if (message.type === 'download') {
        const id = await chrome.downloads.download({url: message.url, filename: message.filename, saveAs: false});
        sendResponse({ok: true, id});
        return;
      }
      sendResponse({ok: true});
      return;
    }
    if (message.type === 'state') sendResponse({ok: true, state: await getState()});
    else if (message.type === 'bootstrap') sendResponse({ok: true, data: await bootstrap()});
    else if (message.type === 'set-key') {
      const apiKey = String(message.apiKey || '').trim();
      if (apiKey.length < 10) throw new Error('api_key_invalid');
      await chrome.storage.session.set({apiKey});
      sendResponse({ok: true});
    } else if (message.type === 'clear-key') {
      if ((await getState()).active) await stop();
      await chrome.storage.session.remove('apiKey');
      sendResponse({ok: true});
    } else if (message.type === 'start') sendResponse({ok: true, state: await start(message.config)});
    else if (message.type === 'stop') sendResponse({ok: true, state: await stop()});
    else if (message.type === 'audio') {
      let state = await getState();
      if (state.active) {
        if (subtitlesEnabled(message.config)) await injectOverlay(state.captureTabId);
        state = await setState({config: message.config});
        await broadcastOverlay(state);
      }
      if (await hasOffscreenDocument()) await chrome.runtime.sendMessage({target: 'offscreen', type: 'audio', config: message.config});
      sendResponse({ok: true});
    }
  })().catch(async (error) => {
    const current = await getState();
    const failed = await setState({active: false, status: 'error', error: error.message});
    await broadcastOverlay(failed);
    if (current.active && await hasOffscreenDocument()) await chrome.offscreen.closeDocument();
    await setState({captureTabId: null, config: null});
    sendResponse({ok: false, error: error.message});
  });
  return true;
});
