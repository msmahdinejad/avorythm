import {DEFAULT_SETTINGS, LANGUAGES, VOICES} from './core.mjs';

const OFFSCREEN_PATH = 'offscreen.html';
const defaultState = {
  active: false,
  status: 'idle',
  error: '',
  sourceText: '',
  translatedText: '',
  sourceLanguage: '',
  recordingReady: false
};

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
    voices: VOICES,
    settings: {...DEFAULT_SETTINGS, ...settings},
    api_key_set: Boolean(apiKey)
  };
}

async function start(config) {
  const current = await getState();
  if (current.active) return current;
  const {apiKey} = await chrome.storage.session.get('apiKey');
  if (!apiKey) throw new Error('api_key_missing');
  await ensureOffscreenDocument();
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id) throw new Error('active_tab_missing');
  const streamId = await chrome.tabCapture.getMediaStreamId({targetTabId: tab.id});
  await setState({active: true, status: 'connecting', error: '', sourceText: '', translatedText: '', recordingReady: false});
  const response = await chrome.runtime.sendMessage({target: 'offscreen', type: 'start', streamId, config, apiKey});
  if (!response?.ok) {
    if (await hasOffscreenDocument()) await chrome.offscreen.closeDocument();
    await setState({active: false, status: 'error', error: response?.error || 'capture_failed'});
    throw new Error(response?.error || 'capture_failed');
  }
  return getState();
}

async function stop() {
  if (await hasOffscreenDocument()) {
    const response = await chrome.runtime.sendMessage({target: 'offscreen', type: 'stop'});
    await chrome.offscreen.closeDocument();
    if (!response?.ok) throw new Error(response?.error || 'stop_failed');
  }
  return setState({active: false, status: 'idle'});
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.session.set({state: defaultState});
  const {settings} = await chrome.storage.local.get('settings');
  if (!settings) await chrome.storage.local.set({settings: DEFAULT_SETTINGS});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen') return false;
  (async () => {
    if (message.target === 'background') {
      if (message.type === 'bridge-state') await setState(message.update);
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
      if (await hasOffscreenDocument()) await chrome.runtime.sendMessage({target: 'offscreen', type: 'audio', config: message.config});
      sendResponse({ok: true});
    }
  })().catch(async (error) => {
    await setState({active: false, status: 'error', error: error.message});
    sendResponse({ok: false, error: error.message});
  });
  return true;
});
