// app.js — Hubble client: chat + real-time talking avatar + speech-to-text.
const SDK = window.SpeechSDK;

// ---- Monochrome purple icon set (stroke = currentColor) ----
const ICON_PATHS = {
  roleplay: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  roi: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  recap: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="5"/><line x1="15" y1="2" x2="15" y2="5"/><line x1="9" y1="19" x2="9" y2="22"/><line x1="15" y1="19" x2="15" y2="22"/><line x1="2" y1="9" x2="5" y2="9"/><line x1="2" y1="15" x2="5" y2="15"/><line x1="19" y1="9" x2="22" y2="9"/><line x1="19" y1="15" x2="22" y2="15"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 22v-4h6v4"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  "book-open": '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  map: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
};
function icon(name, size = 18) {
  const p = ICON_PATHS[name] || ICON_PATHS.link;
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

const els = {
  messages: document.getElementById("messages"),
  composer: document.getElementById("composer"),
  input: document.getElementById("input"),
  sendBtn: document.getElementById("sendBtn"),
  micBtn: document.getElementById("micBtn"),
  stopBtn: document.getElementById("stopBtn"),
  voiceToggle: document.getElementById("voiceToggle"),
  voiceToggleLbl: document.querySelector("#voiceToggle .lbl b"),
  genderSeg: document.getElementById("genderSeg"),
  voiceSelect: document.getElementById("voiceSelect"),
  video: document.getElementById("avatarVideo"),
  canvas: document.getElementById("avatarCanvas"),
  avatarWrap: document.getElementById("avatarWrap"),
  bgPicker: document.getElementById("bgPicker"),
  bgSwatches: document.getElementById("bgSwatches"),
  drawer: document.getElementById("drawer"),
  drawerScrim: document.getElementById("drawerScrim"),
  drawerToggle: document.getElementById("drawerToggle"),
  drawerClose: document.getElementById("drawerClose"),
  drawerLinks: document.getElementById("drawerLinks"),
  roleplayBtn: document.getElementById("roleplayBtn"),
  roiBtn: document.getElementById("roiBtn"),
  recapBtn: document.getElementById("recapBtn"),
  roleplayBanner: document.getElementById("roleplayBanner"),
  roleplayLabel: document.getElementById("roleplayLabel"),
  roleplayEndBtn: document.getElementById("roleplayEndBtn"),
  userChip: document.getElementById("userChip"),
  audio: document.getElementById("avatarAudio"),
  idle: document.getElementById("avatarIdle"),
  status: document.getElementById("avatarStatus"),
  speakingBar: document.getElementById("speakingBar"),
  tagline: document.getElementById("tagline"),
  toast: document.getElementById("toast"),
};

const state = {
  cfg: null,
  threadId: null,
  gender: "female",
  voice: null,
  voiceSel: null,
  voiceEndpointId: "",
  voiceProfileId: "", // personal-voice speakerProfileId (GUID); when set, speak via base model + ttsembedding
  body: null,          // { character, style, customized?, photoModel? } paired with the chosen voice
  background: null,    // chosen background { id, label, css }
  green: "#00FF00FF",  // avatar backdrop colour we chroma-key out
  rafId: null,
  voiceOn: false,
  speechConfig: null,
  tokenInfo: null,
  avatarSynth: null,
  peer: null,
  avatarLive: false,
  recognizer: null,
  listening: false,
  speaking: false,
  stoppedManually: false,
  busy: false,
  pending: null,
  roleplayActive: false,
  userName: null,
  greeted: false,
  endCall: false,
};

// ---------- helpers ----------
function toast(msg, ms = 4200) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove("show"), ms);
}
function setStatus(text, cls) {
  els.status.textContent = text;
  els.status.className = "status" + (cls ? " " + cls : "");
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeXml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}
// Turn bare URLs and **bold** into safe HTML (input is already escaped).
function formatRich(escaped) {
  let html = escaped.replace(/\n/g, "<br>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  html = html.replace(/(https?:\/\/[^\s<]+[^\s<.,;:)\]])/g, (m) => {
    let label = m.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (label.length > 42) label = label.slice(0, 40) + "…";
    return `<a href="${m}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  return html;
}

// ---------- rendering ----------
function addMessage(role, text, citations) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "bot");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = role === "user" ? escapeHtml(text).replace(/\n/g, "<br>") : formatRich(escapeHtml(text));
  if (citations && citations.length) {
    const c = document.createElement("div");
    c.className = "cites";
    citations.forEach((s) => {
      const span = document.createElement("span");
      span.className = "cite";
      span.textContent = s;
      c.appendChild(span);
    });
    bubble.appendChild(c);
  }
  wrap.appendChild(bubble);
  els.messages.appendChild(wrap);
  els.messages.scrollTop = els.messages.scrollHeight;
  return bubble;
}
function addTyping() {
  const wrap = document.createElement("div");
  wrap.className = "msg bot";
  wrap.innerHTML = '<div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
  els.messages.appendChild(wrap);
  els.messages.scrollTop = els.messages.scrollHeight;
  return wrap;
}

// ---------- chat ----------
// Serialized: the Foundry thread allows only one active run at a time, so we
// never fire a second /api/chat while one is in flight. A new request that
// arrives mid-run is held as the single pending item and sent when the run ends.
async function sendMessage(text) {
  text = (text || "").trim();
  if (!text) return;
  // Detect "I'm wrapping up" intent so we don't reopen the mic after the reply.
  state.endCall = isEndingIntent(text);
  els.input.value = "";
  els.input.style.height = "auto";
  dispatch(text, { userText: text });
}

// Unified entry point. opts:
//   userText  — string shown as the user bubble (null = don't show one)
//   speak     — false to skip TTS for this reply
//   onReply   — fn(data) to handle the reply instead of rendering a bot bubble
function dispatch(prompt, opts = {}) {
  interruptAvatar();
  stopListening();
  if (opts.userText) addMessage("user", opts.userText);
  if (state.busy) { state.pending = { prompt, opts }; return; }
  runChat(prompt, opts);
}

// Heuristic: is the user signalling the conversation/call is over?
function isEndingIntent(text) {
  const t = " " + text.toLowerCase().replace(/[^\w\s']/g, " ").replace(/\s+/g, " ") + " ";
  const phrases = [
    "bye", "goodbye", "good bye", "see you", "see ya", "that's all", "thats all",
    "that's it", "thats it", "that will be all", "nothing else", "nothing more",
    "no more questions", "i'm done", "im done", "we're done", "were done", "all done",
    "i'm good", "im good", "that's everything", "thats everything", "gotta go",
    "got to go", "have to go", "end call", "end the call", "hang up", "wrap up",
    "wrap it up", "let's wrap", "thanks that's all", "speak later", "talk later", "catch you later",
  ];
  return phrases.some((p) => t.includes(" " + p + " ") || t.includes(" " + p));
}

async function runChat(prompt, opts = {}) {
  state.busy = true;
  const typing = opts.onReply ? null : addTyping();
  els.sendBtn.disabled = true;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, threadId: state.threadId }),
    });
    const data = await res.json();
    if (typing) typing.remove();
    if (!res.ok) {
      if (opts.onReply) opts.onReply({ error: data.error || "Something went wrong." });
      else addMessage("bot", "⚠️ " + (data.error || "Something went wrong.") + (data.detail ? "\n" + data.detail : ""));
      return;
    }
    state.threadId = data.threadId;
    if (opts.onReply) {
      opts.onReply(data);
    } else {
      addMessage("bot", data.reply, data.citations);
      if (state.voiceOn && state.avatarLive && opts.speak !== false) speak(data.reply);
    }
  } catch (err) {
    if (typing) typing.remove();
    if (opts.onReply) opts.onReply({ error: err.message });
    else addMessage("bot", "⚠️ Network error: " + err.message);
  } finally {
    state.busy = false;
    els.sendBtn.disabled = false;
    els.input.focus();
    if (state.pending) {
      const next = state.pending;
      state.pending = null;
      runChat(next.prompt, next.opts);
    }
  }
}

// First-contact greeting: Hubble introduces itself and asks the seller's name,
// then (via speak → auto-listen) opens the mic so they can just answer aloud.
function kickoffGreeting() {
  if (state.greeted) return;
  state.greeted = true;
  dispatch("[SYSTEM: The seller just turned on voice mode and hasn't spoken yet. Greet them warmly in one or two short sentences and ask their first name. Don't cover anything else yet.]", {});
}

// Strip citation markers / markdown so the avatar speaks naturally
function speakable(text) {
  return text
    .replace(/\[\d+\]/g, "")
    .replace(/\|/g, " ")
    .replace(/[*_`#>]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Stop the avatar talking immediately (barge-in or manual Stop button).
// `manual` = true means the user clicked Stop, so don't auto-reopen the mic.
function interruptAvatar(manual) {
  if (manual) state.stoppedManually = true;
  if (state.avatarSynth && state.speaking) {
    try { state.avatarSynth.stopSpeakingAsync(); } catch (e) { /* ignore */ }
  }
  state.speaking = false;
  els.speakingBar.classList.remove("on");
  els.stopBtn.hidden = true;
}

async function speak(text) {
  if (!state.avatarSynth) return;
  interruptAvatar(); // clear any in-flight speech first
  state.stoppedManually = false;
  // Personal voice (cloned) is spoken via a base model voice with the speaker
  // profile embedded; Custom/standard voices just use the voice name directly.
  const inner = escapeXml(speakable(text));
  const voiceInner = state.voiceProfileId
    ? `<mstts:ttsembedding speakerProfileId="${state.voiceProfileId}">${inner}</mstts:ttsembedding>`
    : inner;
  const mstts = state.voiceProfileId ? ` xmlns:mstts="http://www.w3.org/2001/mstts"` : "";
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"${mstts} xml:lang="en-US">` +
    `<voice name="${state.voice}">${voiceInner}</voice></speak>`;
  els.speakingBar.classList.add("on");
  els.stopBtn.hidden = false;
  state.speaking = true;
  try {
    await state.avatarSynth.speakSsmlAsync(ssml);
  } catch (e) {
    console.warn("speak failed", e);
  } finally {
    state.speaking = false;
    els.speakingBar.classList.remove("on");
    els.stopBtn.hidden = true;
    // Hand the conversation back: re-open the mic so the user can just talk —
    // unless the user pressed Stop, or signalled they're ending the call.
    const canReopen = state.voiceOn && state.avatarLive && !state.listening &&
      !state.stoppedManually && !state.endCall;
    if (canReopen) {
      setTimeout(() => {
        if (state.voiceOn && state.avatarLive && !state.listening && !state.stoppedManually && !state.endCall) startListening();
      }, 450);
    }
  }
}

// ---------- speech auth ----------
async function refreshToken() {
  const r = await fetch("/api/speech-token");
  if (!r.ok) throw new Error("Could not get speech token");
  state.tokenInfo = await r.json();
  if (!state.speechConfig) {
    state.speechConfig = SDK.SpeechConfig.fromAuthorizationToken(state.tokenInfo.token, state.tokenInfo.region);
  } else {
    state.speechConfig.authorizationToken = state.tokenInfo.token;
  }
  return state.tokenInfo;
}

// ---------- avatar ----------
async function startAvatar() {
  setStatus("connecting", "connecting");
  await refreshToken();
  const relayRes = await fetch("/api/relay-token");
  if (!relayRes.ok) throw new Error("Could not get relay token");
  const relay = await relayRes.json();

  const body = state.body || { character: "lisa", style: "casual-sitting" };
  const videoFormat = new SDK.AvatarVideoFormat();
  const avatarConfig = new SDK.AvatarConfig(body.character, body.style || "", videoFormat);
  // Custom (your-likeness) avatar: flag it and, for a photo avatar, set the base model.
  if (body.customized) {
    avatarConfig.customized = true;
    if (body.photoModel) avatarConfig.photoAvatarBaseModel = body.photoModel;
  }
  // Render on a flat green backdrop so we can chroma-key it out and show any
  // background behind the avatar.
  avatarConfig.backgroundColor = state.green;
  state.speechConfig.speechSynthesisVoiceName = state.voice;
  // Custom Neural Voices require the deployment endpoint id; standard voices must NOT have one.
  state.speechConfig.endpointId = state.voiceEndpointId || "";

  const synth = new SDK.AvatarSynthesizer(state.speechConfig, avatarConfig);
  state.avatarSynth = synth;

  const peer = new RTCPeerConnection({
    iceServers: [{ urls: relay.Urls, username: relay.Username, credential: relay.Password }],
  });
  state.peer = peer;

  peer.ontrack = (event) => {
    if (event.track.kind === "video") {
      els.video.srcObject = event.streams[0];
      els.video.play?.().catch(() => {});
      startChromaLoop();
      els.idle.classList.add("hide");
    } else if (event.track.kind === "audio") {
      els.audio.srcObject = event.streams[0];
    }
  };
  peer.addTransceiver("video", { direction: "sendrecv" });
  peer.addTransceiver("audio", { direction: "sendrecv" });

  const result = await synth.startAvatarAsync(peer);
  if (result.reason === SDK.ResultReason.SynthesizingAudioCompleted || result.reason === undefined) {
    state.avatarLive = true;
    setStatus("live", "live");
    applyBackdrop();       // show the chosen scene behind the avatar
    showBgPicker(true);    // scene picker is only relevant while the avatar is shown
  } else {
    let detail = "reason " + result.reason;
    try {
      const cd = SDK.CancellationDetails.fromResult(result);
      detail += " — " + cd.reason + ": " + cd.errorDetails;
    } catch {}
    throw new Error("Avatar failed to start (" + detail + ")");
  }
}

// Draw the avatar video to a canvas each frame, making the green backdrop
// transparent so the chosen CSS background (on .avatar-wrap) shows through.
function startChromaLoop() {
  const canvas = els.canvas;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  els.canvas.classList.add("show");
  const draw = () => {
    state.rafId = requestAnimationFrame(draw);
    const v = els.video;
    if (!v.videoWidth) return;
    // Keep the keying canvas light: cap width ~640px, preserve aspect ratio.
    const w = Math.min(640, v.videoWidth);
    const h = Math.round((v.videoHeight / v.videoWidth) * w);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.drawImage(v, 0, 0, w, h);
    const frame = ctx.getImageData(0, 0, w, h);
    const d = frame.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      // Green-dominant pixels become transparent (soft edge near the threshold).
      if (g > 90 && g > r + 40 && g > b + 40) {
        d[i + 3] = 0;
      } else if (g > 80 && g > r + 20 && g > b + 20) {
        d[i + 3] = Math.min(d[i + 3], 90); // feather fringe
      }
    }
    ctx.putImageData(frame, 0, 0);
  };
  draw();
}

function stopChromaLoop() {
  if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
  els.canvas.classList.remove("show");
}

function stopAvatar() {
  stopChromaLoop();
  clearBackdrop();
  try { state.avatarSynth && state.avatarSynth.close(); } catch {}
  try { state.peer && state.peer.close(); } catch {}
  state.avatarSynth = null;
  state.peer = null;
  state.avatarLive = false;
  els.video.srcObject = null;
  els.idle.classList.remove("hide");
  els.speakingBar.classList.remove("on");
  els.stopBtn.hidden = true;
  state.speaking = false;
  setStatus("offline");
}

// ---------- voice toggle ----------
async function setVoiceOn(on) {
  state.voiceOn = on;
  els.voiceToggle.setAttribute("aria-checked", String(on));
  els.voiceToggleLbl.textContent = on ? "On" : "Off";
  if (on) {
    try {
      state.endCall = false;
      toast("Waking Hubble's avatar… this can take a few seconds.");
      await startAvatar();
      els.micBtn.disabled = false;
      toast("Voice assistant is live. Hubble will say hello — just talk back.");
      kickoffGreeting(); // greet + ask name, then auto-open the mic
    } catch (e) {
      console.error(e);
      toast("Couldn't start the avatar: " + e.message);
      state.voiceOn = false;
      els.voiceToggle.setAttribute("aria-checked", "false");
      els.voiceToggleLbl.textContent = "Off";
      stopAvatar();
      showBgPicker(false);
    }
  } else {
    stopAvatar();
    showBgPicker(false);
    els.micBtn.disabled = true;
    stopListening();
  }
}

// ---------- speech-to-text ----------
async function startListening() {
  if (state.listening) return stopListening();
  // Starting to talk interrupts the avatar mid-speech (barge-in) and means the
  // user is NOT ending the call — clear those flags.
  interruptAvatar();
  state.endCall = false;
  state.stoppedManually = false;
  if (!state.speechConfig) await refreshToken();
  const audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput();
  const rec = new SDK.SpeechRecognizer(state.speechConfig, audioConfig);
  state.recognizer = rec;
  state.listening = true;
  els.micBtn.classList.add("listening");
  rec.recognizeOnceAsync(
    (result) => {
      stopListening();
      if (result.reason === SDK.ResultReason.RecognizedSpeech && result.text) {
        sendMessage(result.text);
      } else {
        toast("Didn't catch that — try again.");
      }
    },
    (err) => { stopListening(); toast("Mic error: " + err); }
  );
}
function stopListening() {
  state.listening = false;
  els.micBtn.classList.remove("listening");
  if (state.recognizer) { try { state.recognizer.close(); } catch {} state.recognizer = null; }
}

// ---------- gender / voice / body pickers ----------
const CUSTOM_VAL = "__custom__";
function currentVoiceObj() {
  return state.cfg.voices[state.gender].find((v) => v.id === state.voiceSel) || state.cfg.voices[state.gender][0];
}
// Resolve the selected dropdown value into the actual SSML voice + avatar body.
function applySelection() {
  const c = state.cfg.custom;
  if (state.voiceSel === CUSTOM_VAL && c) {
    const fallback = state.cfg.voices[c.gender || state.gender][0];
    // Use the custom FACE avatar if trained; otherwise the configured standard body.
    state.body = c.character
      ? { character: c.character, style: c.style || "", customized: true, photoModel: c.photoModel || "" }
      : { character: c.bodyCharacter || fallback.character, style: c.bodyStyle || fallback.style };
    if (c.voiceProfileId) {
      // Personal voice: a base model voice carries your cloned speaker profile via
      // SSML <mstts:ttsembedding>. No endpoint id (treated like a prebuilt voice).
      state.voiceProfileId = c.voiceProfileId;
      state.voice = c.voiceBaseModel || "DragonLatestNeural";
      state.voiceEndpointId = "";
    } else {
      // Custom Neural Voice: a real voice name + its deployment endpoint id.
      state.voiceProfileId = "";
      state.voice = c.voice || fallback.id;
      state.voiceEndpointId = c.voiceEndpointId || "";
    }
    return;
  }
  const v = currentVoiceObj();
  state.voiceSel = v.id;
  state.voice = v.id;
  state.body = { character: v.character, style: v.style };
  state.voiceEndpointId = ""; // standard voices need no endpoint id
  state.voiceProfileId = "";  // standard voices are not personal voices
}
function populateVoices() {
  const list = state.cfg.voices[state.gender];
  els.voiceSelect.innerHTML = "";
  // The custom "You" preset is gender-specific — only show it for its own gender
  // (e.g. the male Jonnychipz avatar shouldn't appear in the Female list).
  if (state.cfg.custom && state.cfg.custom.gender === state.gender) {
    const opt = document.createElement("option");
    opt.value = CUSTOM_VAL;
    opt.textContent = "⭐ " + state.cfg.custom.label;
    els.voiceSelect.appendChild(opt);
  }
  list.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    els.voiceSelect.appendChild(opt);
  });
  state.voiceSel = list[0].id;
  els.voiceSelect.value = state.voiceSel;
  applySelection();
}

async function restartAvatarIfLive(msg) {
  if (!state.voiceOn) return;
  stopAvatar();
  setStatus("connecting", "connecting");
  // Give the service a moment to release the previous avatar session, otherwise
  // the new one is rejected as a concurrent request (throttle 4429).
  await new Promise((r) => setTimeout(r, 1400));
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await startAvatar(); return; }
    catch (e) {
      const throttled = /throttl|4429|concurrent/i.test(e.message || "");
      if (throttled && attempt < 2) { await new Promise((r) => setTimeout(r, 2500)); continue; }
      toast((msg || "Avatar restart failed") + ": " + e.message);
      setStatus("offline");
      return;
    }
  }
}

async function setGender(g) {
  if (g === state.gender) return;
  state.gender = g;
  [...els.genderSeg.children].forEach((b) => b.classList.toggle("active", b.dataset.gender === g));
  populateVoices();
  await restartAvatarIfLive("Couldn't switch avatar");
}

async function setVoice(value) {
  state.voiceSel = value;
  applySelection(); // changing voice also changes the body (and may be the custom "You")
  await restartAvatarIfLive("Couldn't switch voice/body");
}

// ---------- scene background chooser (only when the avatar is on screen) ----------
function backdropCss(bg) {
  return `center / cover no-repeat url("${bg.img}")`;
}
function applyBackdrop() {
  if (state.background) els.avatarWrap.style.background = backdropCss(state.background);
}
function clearBackdrop() {
  els.avatarWrap.style.background = ""; // revert to the default idle gradient
}
function selectBackground(bg) {
  state.background = bg;
  [...els.bgSwatches.children].forEach((s) => s.classList.toggle("active", s.dataset.id === bg.id));
  try { localStorage.setItem("hubble.bg", bg.id); } catch {}
  if (state.avatarLive) applyBackdrop(); // only visible while the avatar is shown
}
function renderBackgrounds() {
  const list = state.cfg.backgrounds || [];
  els.bgSwatches.innerHTML = "";
  list.forEach((bg) => {
    const b = document.createElement("button");
    b.className = "swatch";
    b.dataset.id = bg.id;
    b.title = bg.label;
    b.style.backgroundImage = `url("${bg.img}")`;
    b.addEventListener("click", () => selectBackground(bg));
    els.bgSwatches.appendChild(b);
  });
  // Restore last choice, otherwise randomise for this load.
  let chosen = null;
  try {
    const saved = localStorage.getItem("hubble.bg");
    if (saved) chosen = list.find((x) => x.id === saved);
  } catch {}
  if (!chosen && list.length) chosen = list[Math.floor(Math.random() * list.length)];
  if (chosen) selectBackground(chosen);
}
function showBgPicker(show) {
  els.bgPicker.hidden = !show;
}

// ---------- GitHub resources drawer ----------
function renderResources() {
  const groups = state.cfg.resources || [];
  els.drawerLinks.innerHTML = "";
  groups.forEach((grp) => {
    const lbl = document.createElement("div");
    lbl.className = "drawer-group-label";
    lbl.textContent = grp.group;
    els.drawerLinks.appendChild(lbl);
    grp.links.forEach((l) => {
      const a = document.createElement("a");
      a.className = "drawer-link";
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `<span class="dl-ico">${icon(l.icon, 18)}</span><span><span class="dl-title">${l.title}</span><span class="dl-sub">${l.sub}</span></span>`;
      els.drawerLinks.appendChild(a);
    });
  });
}
function openDrawer(open) {
  els.drawer.classList.toggle("open", open);
  els.drawer.setAttribute("aria-hidden", String(!open));
  els.drawerScrim.hidden = false;
  requestAnimationFrame(() => els.drawerScrim.classList.toggle("show", open));
  if (!open) setTimeout(() => { if (!els.drawer.classList.contains("open")) els.drawerScrim.hidden = true; }, 280);
}

// ---------- modals ----------
function openModal(id, open) {
  document.getElementById(id).hidden = !open;
}

// ---------- Roleplay & scorecard ----------
function startRoleplay() {
  const persona = document.getElementById("rpPersona").value;
  const personaLabel = document.getElementById("rpPersona").selectedOptions[0].text;
  const product = document.getElementById("rpProduct").value;
  const difficulty = document.getElementById("rpDifficulty").value;
  openModal("roleplayModal", false);
  state.roleplayActive = true;
  els.roleplayLabel.textContent = `Roleplay: ${personaLabel}`;
  els.roleplayBanner.hidden = false;
  const directive =
    `[[ROLEPLAY_START]] Enter roleplay mode now. You are no longer the coach — you ARE the customer: ${persona}. ` +
    `The seller is pitching ${product}. Be ${difficulty}. Stay fully in character as the customer, speak in first person, ` +
    `react realistically, raise objections, and ask pointed questions. Keep each turn short and conversational. ` +
    `Do NOT coach or break character until you receive [[ROLEPLAY_SCORE]]. Open with a brief, in-character greeting that sets the scene.`;
  dispatch(directive, { userText: `Starting roleplay — ${personaLabel}` });
}
function endRoleplayAndScore() {
  if (!state.roleplayActive) return;
  state.roleplayActive = false;
  els.roleplayBanner.hidden = true;
  const directive =
    `[[ROLEPLAY_SCORE]] Roleplay over — break character and become Hubble the coach again. Score the seller's performance ` +
    `in this roleplay. Give a short scorecard with ratings out of 5 for: Discovery, Value & positioning, Objection handling, ` +
    `and Next-step / close. Then 2–3 specific things they did well and 2–3 concrete improvements. Keep it punchy and encouraging.`;
  dispatch(directive, { userText: "End & score me" });
}

// ---------- ROI calculator ----------
const FX = { USD: 1, GBP: 0.79, EUR: 0.92 };
const SYM = { USD: "$", GBP: "£", EUR: "€" };
function fmtMoney(usd, cur) {
  const v = usd * (FX[cur] || 1);
  return SYM[cur] + Math.round(v).toLocaleString("en-US");
}
function computeRoi() {
  const seat = Number(document.getElementById("roiPlan").value);
  const seats = Math.max(1, Number(document.getElementById("roiSeats").value) || 0);
  const salary = Math.max(0, Number(document.getElementById("roiSalary").value) || 0);
  const uplift = Number(document.getElementById("roiUplift").value);
  const cur = document.getElementById("roiCurrency").value;
  const annualCost = seat * seats * 12;
  const annualValue = salary * uplift * seats;
  const net = annualValue - annualCost;
  const roiX = annualCost > 0 ? annualValue / annualCost : 0;
  const paybackWeeks = annualValue > 0 ? (annualCost / annualValue) * 52 : 0;
  const rows = [
    ["Annual Copilot cost", fmtMoney(annualCost, cur), false],
    ["Est. annual productivity value", fmtMoney(annualValue, cur), false],
    ["Net annual benefit", fmtMoney(net, cur), false],
    ["Payback", paybackWeeks < 52 ? `${paybackWeeks.toFixed(1)} weeks` : `${(paybackWeeks / 52).toFixed(1)} yrs`, false],
    ["Return on investment", `${roiX.toFixed(1)}× (${Math.round((roiX - 1) * 100)}% ROI)`, true],
  ];
  document.getElementById("roiResults").innerHTML = rows
    .map(([k, v, hl]) => `<div class="roi-row${hl ? " headline" : ""}"><span class="k">${k}</span><span class="v">${v}</span></div>`)
    .join("");
  return { seat, seats, salary, uplift, cur, annualCost, annualValue, net, roiX, paybackWeeks };
}
function roiCoachPrompt() {
  const r = computeRoi();
  const planName = document.getElementById("roiPlan").selectedOptions[0].text;
  openModal("roiModal", false);
  const msg =
    `I've modelled a Copilot business case: ${r.seats} seats on ${planName}, ` +
    `assuming a ${Math.round(r.uplift * 100)}% productivity uplift on a ${SYM[r.cur]}${Math.round(r.salary * (FX[r.cur] || 1)).toLocaleString()} average developer salary. ` +
    `That's ${fmtMoney(r.annualCost, r.cur)}/yr cost vs ${fmtMoney(r.annualValue, r.cur)}/yr value (${r.roiX.toFixed(1)}× ROI). ` +
    `Coach me on how to present this business case to the customer — what to emphasise, what to validate, and the next step.`;
  dispatch(msg, { userText: "Coach my ROI business case" });
}

// ---------- Session recap ----------
function openRecap() {
  openModal("recapModal", true);
  document.getElementById("recapOut").textContent = "Generating your recap…";
  document.getElementById("recapActions").hidden = true;
  const directive =
    "[[SESSION_RECAP]] Produce a concise written recap of THIS session for the seller to keep. " +
    "Use plain text with short sections: Topics covered, Key facts & numbers, Action items, and Useful links (official GitHub/Microsoft URLs). " +
    "Be specific to what we actually discussed. This is for reading, not speaking.";
  dispatch(directive, {
    userText: null,
    speak: false,
    onReply: (data) => {
      const out = document.getElementById("recapOut");
      if (data.error) { out.textContent = "⚠️ " + data.error; return; }
      state.lastRecap = data.reply;
      out.textContent = data.reply;
      document.getElementById("recapActions").hidden = false;
    },
  });
}
function downloadRecap() {
  const blob = new Blob([state.lastRecap || ""], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hubble-recap-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function emailRecap() {
  const subject = encodeURIComponent("Hubble session recap — GitHub coaching");
  const body = encodeURIComponent(state.lastRecap || "");
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// ---------- signed-in user chip ----------
async function renderUser() {
  try {
    const r = await fetch("/api/me");
    if (!r.ok) { location.href = "/login"; return; }
    const u = await r.json();
    state.me = u;
    const fallback = "favicon.svg";
    const av = u.avatar || fallback;
    document.getElementById("profileAvatar").src = av;
    document.getElementById("profileAvatar").onerror = function () { this.src = fallback; };
    document.getElementById("profileName").textContent = u.name || u.login;

    const usage = u.usage || { total: 0, chats: 0 };
    const adminBadge = u.isAdmin ? '<span class="pm-badge">Admin</span>' : "";
    const adminLink = u.isAdmin
      ? `<a class="pm-link admin" href="/admin">${icon("roleplay", 16)}<span>Admin dashboard</span></a>` : "";
    document.getElementById("profileMenu").innerHTML = `
      <div class="pm-head">
        <img src="${av}" alt="" onerror="this.src='${fallback}'"/>
        <div>
          <div class="pm-name">${escHtml(u.name || u.login)} ${adminBadge}</div>
          <div class="pm-sub">@${escHtml(u.login)}</div>
          ${u.email ? `<div class="pm-sub">${escHtml(u.email)}</div>` : ""}
        </div>
      </div>
      <div class="pm-stats">
        <div class="pm-stat"><div class="v">${usage.total || 0}</div><div class="k">Events</div></div>
        <div class="pm-stat"><div class="v">${usage.chats || 0}</div><div class="k">Chats</div></div>
        <div class="pm-stat"><div class="v">${u.publicRepos ?? "—"}</div><div class="k">Repos</div></div>
      </div>
      <div class="pm-links">
        ${adminLink}
        <a class="pm-link" href="${u.htmlUrl || "https://github.com/" + u.login}" target="_blank" rel="noopener noreferrer">${icon("link", 16)}<span>GitHub profile</span></a>
        <a class="pm-link" href="/auth/logout">${icon("stop", 16)}<span>Sign out</span></a>
        <a class="pm-link danger" id="deleteAcctLink" href="#">${icon("close", 16)}<span>Delete my account</span></a>
      </div>`;
    document.getElementById("profile").hidden = false;

    document.getElementById("profileBtn").onclick = (e) => {
      e.stopPropagation();
      const m = document.getElementById("profileMenu");
      m.hidden = !m.hidden;
      document.getElementById("profileBtn").setAttribute("aria-expanded", String(!m.hidden));
    };
    document.addEventListener("click", () => { document.getElementById("profileMenu").hidden = true; });
    document.getElementById("profileMenu").addEventListener("click", (e) => e.stopPropagation());
    document.getElementById("deleteAcctLink").addEventListener("click", (e) => { e.preventDefault(); deleteMyAccount(); });
  } catch { /* ignore */ }
}

function escHtml(s) {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

async function deleteMyAccount() {
  if (!confirm("Delete your Hubble account? This removes your access and data. The admin will be notified. You can sign up again later.")) return;
  try {
    const r = await fetch("/api/me/delete", { method: "POST" });
    const d = await r.json();
    if (!r.ok) { toast(d.error || "Couldn't delete account"); return; }
    location.href = "/login";
  } catch (e) { toast("Network error: " + e.message); }
}

// ---------- init ----------
function paintIcons() {
  els.roleplayBtn.innerHTML = icon("roleplay") + "<span>Roleplay</span>";
  els.roiBtn.innerHTML = icon("roi") + "<span>ROI</span>";
  els.recapBtn.innerHTML = icon("recap") + "<span>Recap</span>";
  document.getElementById("aboutBtn").innerHTML = icon("info") + "<span>About</span>";
  els.micBtn.innerHTML = icon("mic", 20);
  els.stopBtn.innerHTML = icon("stop", 16) + "<span>Stop</span>";
  els.sendBtn.innerHTML = icon("send", 18);
  els.drawerToggle.innerHTML = icon("menu", 20);
}

async function init() {
  if (!SDK) { toast("Speech SDK failed to load."); }
  paintIcons();
  renderUser();
  const r = await fetch("/api/config");
  state.cfg = await r.json();
  state.green = state.cfg.avatarGreen || state.green;
  els.tagline.textContent = state.cfg.tagline;
  populateVoices();
  renderBackgrounds(); // randomises on first load (applied when avatar is shown)
  renderResources();
  showBgPicker(false); // hidden until the avatar is live

  els.composer.addEventListener("submit", (e) => { e.preventDefault(); sendMessage(els.input.value); });
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(els.input.value); }
  });
  els.input.addEventListener("input", () => {
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 140) + "px";
  });
  els.voiceToggle.addEventListener("click", () => setVoiceOn(!state.voiceOn));
  els.micBtn.addEventListener("click", startListening);
  els.stopBtn.addEventListener("click", () => interruptAvatar(true));
  els.genderSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-gender]");
    if (b) setGender(b.dataset.gender);
  });
  els.voiceSelect.addEventListener("change", () => { setVoice(els.voiceSelect.value); });
  document.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => sendMessage(c.textContent))
  );
  // GitHub resources drawer
  els.drawerToggle.addEventListener("click", () => openDrawer(true));
  els.drawerClose.addEventListener("click", () => openDrawer(false));
  els.drawerScrim.addEventListener("click", () => openDrawer(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") openDrawer(false); });

  // Feature toolbar
  els.roleplayBtn.addEventListener("click", () => openModal("roleplayModal", true));
  els.roiBtn.addEventListener("click", () => { openModal("roiModal", true); computeRoi(); });
  els.recapBtn.addEventListener("click", openRecap);
  document.getElementById("aboutBtn").addEventListener("click", () => openModal("aboutModal", true));
  els.roleplayEndBtn.addEventListener("click", endRoleplayAndScore);
  document.getElementById("rpStartBtn").addEventListener("click", startRoleplay);
  document.getElementById("roiCoachBtn").addEventListener("click", roiCoachPrompt);
  document.getElementById("recapCopyBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(state.lastRecap || "").then(() => toast("Recap copied to clipboard."));
  });
  document.getElementById("recapDownloadBtn").addEventListener("click", downloadRecap);
  document.getElementById("recapEmailBtn").addEventListener("click", emailRecap);
  ["roiPlan", "roiSeats", "roiSalary", "roiUplift", "roiCurrency"].forEach((id) =>
    document.getElementById(id).addEventListener("input", computeRoi)
  );
  // Modal close buttons + scrim click
  document.querySelectorAll(".modal-close").forEach((b) =>
    b.addEventListener("click", () => openModal(b.dataset.close, false))
  );
  document.querySelectorAll(".modal-scrim").forEach((s) =>
    s.addEventListener("click", (e) => { if (e.target === s) s.hidden = true; })
  );

  // keep the speech auth token fresh for long sessions
  setInterval(() => { if (state.speechConfig) refreshToken().catch(() => {}); }, 8 * 60 * 1000);
}

init();
