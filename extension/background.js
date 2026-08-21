import {DEFAULT_SETTINGS, LANGUAGES, normalizeSettings, outputMix, subtitlesEnabled} from './core.mjs';

const OFFSCREEN_PATH = 'offscreen.html';
const defaultState = {
  active: false,
  status: 'idle',
  error: '',
  sourceText: '',
  translatedText: '',
  sourceLanguage: '',
  recordingReady: false,
  videoRecordingReady: false,
  captureTabId: null,
  playerTabId: null,
  sourceTitle: '',
  syncArtifacts: null,
  completionReason: '',
  config: null
};
let stopPromise = null;

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
      type: 'avorythm-overlay',
      active: state.active,
      sourceText: state.sourceText,
      translatedText: state.translatedText,
      settings: state.config || DEFAULT_SETTINGS,
      output: outputMix(state.config || DEFAULT_SETTINGS, 'low-latency')
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

async function controlSourceMedia(tabId, action) {
  const [{result} = {}] = await chrome.scripting.executeScript({
    target: {tabId},
    func: async (nextAction) => {
      const media = [...document.querySelectorAll('video,audio')]
        .filter((element) => element.duration > 0 || !element.paused)
        .sort((left, right) => (right.clientWidth * right.clientHeight) - (left.clientWidth * left.clientHeight))[0];
      if (!media) return {ok: false};
      const wasPaused = media.paused;
      if (nextAction === 'pause') media.pause();
      else {
        try { await media.play(); }
        catch (error) { return {ok: false, wasPaused, paused: media.paused, error: error?.name || 'play_failed'}; }
      }
      return {ok: true, wasPaused, paused: media.paused, currentTime: media.currentTime};
    },
    args: [action]
  });
  return result || {ok: false};
}

async function bootstrap() {
  const [{settings}, {apiKey, groqApiKey}] = await Promise.all([
    chrome.storage.local.get('settings'),
    chrome.storage.session.get(['apiKey', 'groqApiKey'])
  ]);
  return {
    languages: LANGUAGES,
    settings: normalizeSettings(settings),
    api_key_set: Boolean(apiKey),
    groq_api_key_set: Boolean(groqApiKey)
  };
}

async function start(config) {
  const current = await getState();
  if (current.active) return current;
  const nextConfig = normalizeSettings(config);
  if (nextConfig.consentVersion !== 1) throw new Error('consent_required');
  if (nextConfig.recording && !await chrome.permissions.contains({permissions: ['downloads']})) {
    throw new Error('downloads_permission_missing');
  }
  const {apiKey, groqApiKey} = await chrome.storage.session.get(['apiKey', 'groqApiKey']);
  if (!apiKey) throw new Error('api_key_missing');
  if (nextConfig.playbackMode === 'synchronized' && nextConfig.syncCaptionEngine === 'whisper' && !groqApiKey) {
    throw new Error('groq_key_missing');
  }
  if (nextConfig.playbackMode === 'synchronized' && nextConfig.syncCaptionEngine === 'whisper' &&
      !await chrome.permissions.contains({origins: ['https://api.groq.com/*']})) {
    throw new Error('groq_permission_missing');
  }
  await ensureOffscreenDocument();
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id) throw new Error('active_tab_missing');
  if (subtitlesEnabled(nextConfig) && nextConfig.playbackMode !== 'synchronized') await injectOverlay(tab.id);
  const streamId = await chrome.tabCapture.getMediaStreamId({targetTabId: tab.id});
  let playerTabId = null;
  let sourceMediaFound = false;
  if (nextConfig.playbackMode === 'synchronized') {
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['source-bridge.js']});
    const paused = await controlSourceMedia(tab.id, 'pause');
    sourceMediaFound = Boolean(paused.ok);
    await chrome.storage.session.remove('playerSession');
  }
  await setState({
    active: true,
    status: 'connecting',
    error: '',
    sourceText: '',
    translatedText: '',
    sourceLanguage: '',
    recordingReady: false,
    videoRecordingReady: false,
    syncArtifacts: null,
    completionReason: '',
    captureTabId: tab.id,
    playerTabId,
    sourceTitle: tab.title || '',
    config: nextConfig
  });
  if (nextConfig.playbackMode === 'synchronized') {
    try {
      const player = await chrome.tabs.create({url: chrome.runtime.getURL('player.html'), active: false});
      playerTabId = player.id || null;
      await setState({playerTabId});
    } catch (error) {
      if (sourceMediaFound) await controlSourceMedia(tab.id, 'play').catch(() => {});
      throw error;
    }
  }
  await broadcastOverlay(await getState());
  let response;
  try {
    response = await chrome.runtime.sendMessage({target: 'offscreen', type: 'start', streamId, config: nextConfig, apiKey, groqApiKey: groqApiKey || ''});
  } catch (error) {
    response = {ok: false, error: error.message || 'capture_failed'};
  }
  if (!response?.ok) {
    if (await hasOffscreenDocument()) await chrome.offscreen.closeDocument();
    if (playerTabId && chrome.tabs?.remove) await chrome.tabs.remove(playerTabId).catch(() => {});
    if (sourceMediaFound) await controlSourceMedia(tab.id, 'play').catch(() => {});
    const failed = await setState({active: false, status: 'error', error: response?.error || 'capture_failed'});
    await broadcastOverlay(failed);
    await setState({captureTabId: null, playerTabId: null, config: null});
    throw new Error(response?.error || 'capture_failed');
  }
  if (sourceMediaFound) {
    const resumed = await controlSourceMedia(tab.id, 'play');
    if (!resumed.ok) {
      await chrome.runtime.sendMessage({target: 'offscreen', type: 'stop'}).catch(() => {});
      if (await hasOffscreenDocument()) await chrome.offscreen.closeDocument();
      if (playerTabId && chrome.tabs?.remove) await chrome.tabs.remove(playerTabId).catch(() => {});
      await setState({active: false, status: 'error', error: 'source_resume_failed', captureTabId: null, playerTabId: null, config: null});
      throw new Error('source_resume_failed');
    }
  }
  if (playerTabId && chrome.tabs?.update) await chrome.tabs.update(playerTabId, {active: true});
  return getState();
}

async function performStop(requestingTabId = null, keepPlayer = false, completionReason = 'manual') {
  const current = await getState();
  if (!current.active && !await hasOffscreenDocument()) return current;
  await setState({status: 'finalizing', completionReason});
  let failure = null;
  if (await hasOffscreenDocument()) {
    try {
      const response = await chrome.runtime.sendMessage({target: 'offscreen', type: 'stop'});
      if (!response?.ok) failure = new Error(response?.error || 'stop_failed');
    } catch (error) {
      failure = error;
    }
    try {
      await chrome.offscreen.closeDocument();
    } catch (error) {
      failure ||= error;
    }
  }
  const state = await setState({
    active: false,
    status: failure ? 'error' : 'idle',
    error: failure ? failure.message || 'stop_failed' : ''
  });
  await broadcastOverlay({...current, active: false});
  if (!keepPlayer && current.playerTabId && current.playerTabId !== requestingTabId && chrome.tabs?.remove) {
    await chrome.tabs.remove(current.playerTabId).catch(() => {});
  }
  const stopped = await setState({...state, captureTabId: null, playerTabId: null, config: null});
  if (failure) throw failure;
  return stopped;
}

function stop(requestingTabId = null, keepPlayer = false, completionReason = 'manual') {
  if (stopPromise) return stopPromise;
  stopPromise = performStop(requestingTabId, keepPlayer, completionReason).finally(() => { stopPromise = null; });
  return stopPromise;
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
    } else if (message.type === 'set-groq-key') {
      const apiKey = String(message.apiKey || '').trim();
      if (apiKey.length < 10) throw new Error('api_key_invalid');
      await chrome.storage.session.set({groqApiKey: apiKey});
      sendResponse({ok: true});
    } else if (message.type === 'clear-groq-key') {
      if ((await getState()).active) await stop();
      await chrome.storage.session.remove('groqApiKey');
      sendResponse({ok: true});
    } else if (message.type === 'start') sendResponse({ok: true, state: await start(message.config)});
    else if (message.type === 'stop') sendResponse({ok: true, state: await stop(sender.tab?.id || null, Boolean(message.keepPlayer))});
    else if (message.type === 'source-media-state') {
      const state = await getState();
      if (sender.tab?.id === state.captureTabId && (message.state?.ended || message.state?.completed) && state.active) {
        sendResponse({ok: true, state: await stop(null, true, message.state?.completionReason || 'ended')});
      } else sendResponse({ok: true});
    }
    else if (message.type === 'audio') {
      let state = await getState();
      const nextConfig = normalizeSettings(message.config);
      if (state.active) {
        if (subtitlesEnabled(nextConfig) && nextConfig.playbackMode !== 'synchronized') await injectOverlay(state.captureTabId);
        state = await setState({config: nextConfig});
        await broadcastOverlay(state);
      }
      if (await hasOffscreenDocument()) await chrome.runtime.sendMessage({target: 'offscreen', type: 'audio', config: nextConfig});
      sendResponse({ok: true});
    } else if (message.type === 'media-control') {
      const state = await getState();
      if (!state.captureTabId) throw new Error('active_tab_missing');
      const result = await controlSourceMedia(state.captureTabId, message.action);
      sendResponse({ok: Boolean(result?.ok), result});
    }
  })().catch(async (error) => {
    if (message.type === 'start') {
      const current = await getState();
      const failed = await setState({active: false, status: 'error', error: error.message});
      await broadcastOverlay(failed);
      if (current.active && await hasOffscreenDocument()) await chrome.offscreen.closeDocument();
      if (current.playerTabId && chrome.tabs?.remove) await chrome.tabs.remove(current.playerTabId).catch(() => {});
      await setState({captureTabId: null, playerTabId: null, config: null});
    }
    sendResponse({ok: false, error: error.message});
  });
  return true;
});

chrome.tabs?.onRemoved?.addListener(async (tabId) => {
  const state = await getState();
  if (!state.active) return;
  if (tabId === state.playerTabId) await stop().catch(() => {});
  else if (tabId === state.captureTabId) await stop(null, true).catch(() => {});
});
