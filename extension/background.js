const COMPANION = 'http://127.0.0.1:8765';
const OFFSCREEN_PATH = 'offscreen.html';

const defaultState = {
  active: false,
  status: 'idle',
  error: '',
  sourceText: '',
  translatedText: '',
  sourceLanguage: '',
  recordingUrl: ''
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
  const url = chrome.runtime.getURL(OFFSCREEN_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [url]
  });
  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['USER_MEDIA'],
    justification: 'Capture and reroute the active tab audio for live dubbing.'
  });
}

async function companion(path = '/api/health') {
  const response = await fetch(`${COMPANION}${path}`);
  if (!response.ok) throw new Error(`companion_${response.status}`);
  return response.json();
}

async function start(config) {
  const current = await getState();
  if (current.active) return current;
  await companion();
  await ensureOffscreenDocument();
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id) throw new Error('active_tab_missing');
  const streamId = await chrome.tabCapture.getMediaStreamId({targetTabId: tab.id});
  await setState({active: true, status: 'connecting', error: '', sourceText: '', translatedText: ''});
  const response = await chrome.runtime.sendMessage({target: 'offscreen', type: 'start', streamId, config});
  if (!response?.ok) {
    if (await hasOffscreenDocument()) await chrome.offscreen.closeDocument();
    await setState({active: false, status: 'error', error: response?.error || 'capture_failed'});
    throw new Error(response?.error || 'capture_failed');
  }
  return getState();
}

async function stop() {
  if (await hasOffscreenDocument()) {
    await chrome.runtime.sendMessage({target: 'offscreen', type: 'stop'});
    await chrome.offscreen.closeDocument();
  }
  return setState({active: false, status: 'idle'});
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.session.set({state: defaultState});
  const existing = await chrome.storage.local.get('settings');
  if (!existing.settings) {
    await chrome.storage.local.set({settings: {
      locale: 'fa', targetLanguage: 'fa', voice: 'Native',
      voiceStyle: 'Natural, clear, cinematic dubbing', audioMode: 'dub',
      originalVolume: 0, dubVolume: 1, autoDuck: true, recording: false
    }});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen') return false;
  (async () => {
    if (message.target === 'background') {
      if (message.type === 'bridge-state') await setState(message.update);
      sendResponse({ok: true});
      return;
    }
    if (message.type === 'state') sendResponse({ok: true, state: await getState()});
    else if (message.type === 'bootstrap') sendResponse({ok: true, data: await companion('/api/bootstrap')});
    else if (message.type === 'start') sendResponse({ok: true, state: await start(message.config)});
    else if (message.type === 'stop') sendResponse({ok: true, state: await stop()});
    else if (message.type === 'audio') {
      await chrome.runtime.sendMessage({target: 'offscreen', type: 'audio', config: message.config});
      sendResponse({ok: true});
    } else if (message.type === 'open-dashboard') {
      await chrome.tabs.create({url: COMPANION});
      sendResponse({ok: true});
    }
  })().catch(async (error) => {
    await setState({active: false, status: 'error', error: error.message});
    sendResponse({ok: false, error: error.message});
  });
  return true;
});
