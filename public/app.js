// ClientSphere client: customer switching, Foundry chat, avatar, and speech.
const SDK = window.SpeechSDK;

// ---- Monochrome purple icon set (stroke = currentColor) ----
const ICON_PATHS = {
  roleplay: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  brief: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
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
  scan: '<path d="M3 7V4a1 1 0 0 1 1-1h3"/><path d="M17 3h3a1 1 0 0 1 1 1v3"/><path d="M21 17v3a1 1 0 0 1-1 1h-3"/><path d="M7 21H4a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="12" r="3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21h-4v-.08a1.7 1.7 0 0 0-1.1-1.52 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3v-4h.08A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.08A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.37.37.7.6 1 .28.36.43.8.4 1.25V13c.03.45-.12.89-.4 1.25-.23.3-.44.63-.6 1z"/>',
  route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M8.5 17.5 16 7"/><path d="M9 5h3a4 4 0 0 1 4 4v0"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 6-6"/><circle cx="15" cy="9" r="1" fill="currentColor"/>',
  activity: '<polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/>',
  compass: '<circle cx="12" cy="12" r="9"/><polygon points="16 8 14 14 8 16 10 10 16 8"/>',
  leaf: '<path d="M20 4c-8 0-14 4-14 10a6 6 0 0 0 6 6c6 0 8-8 8-16z"/><path d="M6 20c2-5 6-8 12-12"/>',
  checklist: '<path d="m4 6 2 2 4-4"/><path d="M12 6h8"/><path d="m4 13 2 2 4-4"/><path d="M12 13h8"/><path d="m4 20 2 2 4-4"/><path d="M12 20h8"/>',
  sparkles: '<path d="m12 3-1 3-3 1 3 1 1 3 1-3 3-1-3-1-1-3z"/><path d="m18 13-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2z"/><path d="m6 14-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2z"/>',
  chart: '<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V3"/><path d="M2 19h22"/>',
  megaphone: '<path d="m3 11 15-6v14L3 13z"/><path d="M11.6 16.4 13 22H8l-1.2-7.2"/><path d="M21 9v6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/>',
  paperclip: '<path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 1 1-2.8-2.8l8.9-8.9"/>',
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
  briefBtn: document.getElementById("briefBtn"),
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
  customerPopover: document.getElementById("customerPopover"),
  customerSearch: document.getElementById("customerSearch"),
  customerOptions: document.getElementById("customerOptions"),
  customerCount: document.getElementById("customerCount"),
  customerLogo: document.getElementById("customerLogo"),
  customerInitials: document.getElementById("customerInitials"),
  customerName: document.getElementById("customerName"),
  customerSector: document.getElementById("customerSector"),
  agentModeGrid: document.getElementById("agentModeGrid"),
  agentModeDetail: document.getElementById("agentModeDetail"),
  agentModeBadge: document.getElementById("agentModeBadge"),
  responseModeSeg: document.getElementById("responseModeSeg"),
  attachBtn: document.getElementById("attachBtn"),
  imageInput: document.getElementById("imageInput"),
  attachmentPreview: document.getElementById("attachmentPreview"),
  attachmentThumb: document.getElementById("attachmentThumb"),
  attachmentName: document.getElementById("attachmentName"),
  attachmentRemove: document.getElementById("attachmentRemove"),
  avatarIdleCopy: document.getElementById("avatarIdleCopy"),
  welcomeBubble: document.getElementById("welcomeBubble"),
  drawerTitle: document.getElementById("drawerTitle"),
  toast: document.getElementById("toast"),
};

const state = {
  cfg: null,
  customer: null,
  resources: [],
  agentMode: "general",
  responseMode: "brief",
  attachment: null,
  attachmentGeneration: 0,
  fileReader: null,
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
  generation: 0,
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
  const attachment = state.attachment;
  els.input.value = "";
  els.input.style.height = "auto";
  clearAttachment();
  dispatch(text, {
    userText: attachment ? `${text}\nAttached image: ${attachment.name}` : text,
    attachment,
  });
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
  const generation = state.generation;
  state.busy = true;
  const typing = opts.onReply ? null : addTyping();
  els.sendBtn.disabled = true;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: prompt,
        threadId: state.threadId,
        customerId: state.customer?.id,
        agentMode: state.agentMode,
        responseMode: state.responseMode,
        attachments: opts.attachment ? [opts.attachment] : [],
      }),
    });
    const data = await res.json();
    if (generation !== state.generation) {
      if (typing) typing.remove();
      return;
    }
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
      if (data.responseMode === "brief" && state.voiceOn && state.avatarLive && opts.speak !== false) speak(data.reply);
    }
  } catch (err) {
    if (typing) typing.remove();
    if (generation !== state.generation) return;
    if (opts.onReply) opts.onReply({ error: err.message });
    else addMessage("bot", "⚠️ Network error: " + err.message);
  } finally {
    if (generation !== state.generation) return;
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

// First-contact greeting for the active customer adviser.
function kickoffGreeting() {
  if (state.greeted) return;
  state.greeted = true;
  const mode = currentModeDefinition();
  dispatch(`[SYSTEM: The user just turned on voice mode for ${state.customer.name}. Greet them in one or two short sentences, identify yourself as the ${mode.name}, and ask what they want to discuss or demonstrate.]`, {});
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
      toast("Starting the ClientSphere avatar. This can take a few seconds.");
      await startAvatar();
      els.micBtn.disabled = false;
      toast("Voice assistant is live. The customer adviser will say hello.");
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
  // Custom avatars use values like "__custom__:<id>"; find the matching one.
  if (typeof state.voiceSel === "string" && state.voiceSel.startsWith(CUSTOM_VAL)) {
    const id = state.voiceSel.slice(CUSTOM_VAL.length + 1);
    const list = state.cfg.customAvatars || (state.cfg.custom ? [state.cfg.custom] : []);
    const c = list.find((a) => (a.id || a.character) === id) || list[0];
    if (c) {
      const fallback = state.cfg.voices[c.gender || state.gender][0];
      // Use the custom FACE avatar if trained; otherwise the configured standard body.
      state.body = c.character
        ? { character: c.character, style: c.style || "", customized: true, photoModel: c.photoModel || "" }
        : { character: c.bodyCharacter || fallback.character, style: c.bodyStyle || fallback.style };
      if (c.voiceProfileId) {
        // Personal voice: a base model voice carries the cloned speaker profile via
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
  // Custom avatar presets are gender-specific — only show those for the current
  // gender (e.g. the male Jonnychipz avatars don't appear in the Female list).
  const customList = state.cfg.customAvatars || (state.cfg.custom ? [state.cfg.custom] : []);
  let firstCustomVal = null;
  customList.filter((a) => (a.gender || "male") === state.gender).forEach((a) => {
    const opt = document.createElement("option");
    const val = CUSTOM_VAL + ":" + (a.id || a.character);
    opt.value = val;
    opt.textContent = "⭐ " + (a.label || a.character);
    els.voiceSelect.appendChild(opt);
    if (!firstCustomVal) firstCustomVal = val;
  });
  list.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    els.voiceSelect.appendChild(opt);
  });
  state.voiceSel = firstCustomVal || list[0].id;
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
  try { localStorage.setItem("clientsphere.bg", bg.id); } catch {}
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
    const saved = localStorage.getItem("clientsphere.bg");
    if (saved) chosen = list.find((x) => x.id === saved);
  } catch {}
  if (!chosen && list.length) chosen = list[Math.floor(Math.random() * list.length)];
  if (chosen) selectBackground(chosen);
}
function showBgPicker(show) {
  els.bgPicker.hidden = !show;
}

// ---------- multimodal attachment ----------
function clearAttachment() {
  state.attachmentGeneration += 1;
  if (state.fileReader?.readyState === FileReader.LOADING) state.fileReader.abort();
  state.fileReader = null;
  state.attachment = null;
  if (els.imageInput) els.imageInput.value = "";
  if (els.attachmentPreview) els.attachmentPreview.hidden = true;
  if (els.attachBtn) els.attachBtn.classList.remove("active");
}

function selectImage(file) {
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    toast("Choose a PNG, JPEG, or WebP image.");
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    toast("Choose an image smaller than 4 MB.");
    return;
  }
  clearAttachment();
  const generation = state.attachmentGeneration;
  const reader = new FileReader();
  state.fileReader = reader;
  reader.onerror = () => {
    if (generation === state.attachmentGeneration) toast("Could not read that image.");
  };
  reader.onload = () => {
    if (generation !== state.attachmentGeneration) return;
    state.fileReader = null;
    state.attachment = {
      name: file.name,
      mimeType: file.type,
      dataUrl: String(reader.result),
    };
    els.attachmentThumb.src = state.attachment.dataUrl;
    els.attachmentName.textContent = `${file.name} - ${(file.size / 1024).toFixed(0)} KB`;
    els.attachmentPreview.hidden = false;
    els.attachBtn.classList.add("active");
  };
  reader.readAsDataURL(file);
}

// ---------- customer selection and intelligence drawer ----------
function setCustomerLogo(customer) {
  els.customerInitials.textContent = customer.initials;
  els.customerInitials.hidden = false;
  els.customerLogo.hidden = true;
  els.customerLogo.onload = () => {
    els.customerLogo.hidden = false;
    els.customerInitials.hidden = true;
  };
  els.customerLogo.onerror = () => {
    els.customerLogo.hidden = true;
    els.customerInitials.hidden = false;
  };
  els.customerLogo.src = customer.logoUrl;
  els.customerLogo.alt = `${customer.name} logo`;
}

function generalModeDefinition() {
  return {
    id: "general",
    name: "General Adviser",
    icon: "compass",
    modelLabel: "GPT-5.6 Sol",
    supportsImages: true,
    summary: `Fast, source-grounded conversation about ${state.customer.name}'s business, strategy, products, financial context, leadership, and recent developments.`,
    businessValue: "Executive customer understanding and meeting coaching.",
    prompts: state.customer.topics.slice(0, 3).map((topic) => `Brief me on ${topic.toLowerCase()} for ${state.customer.name}.`),
    workflow: [],
  };
}

function agentModes() {
  return [generalModeDefinition(), ...(state.customer?.useCases || [])];
}

function currentModeDefinition() {
  return agentModes().find((mode) => mode.id === state.agentMode) || generalModeDefinition();
}

function selectResponseMode(mode) {
  if (!["brief", "structured"].includes(mode)) return;
  state.responseMode = mode;
  [...els.responseModeSeg.querySelectorAll("[data-response-mode]")].forEach((button) => {
    button.classList.toggle("active", button.dataset.responseMode === mode);
  });
  try { localStorage.setItem("clientsphere.responseMode", mode); } catch {}
  toast(mode === "brief"
    ? "Brief + voice mode: concise conversational answers."
    : "Structured mode: detailed screen-first answers.");
}

function renderAgentModes() {
  const modes = agentModes();
  const active = currentModeDefinition();
  els.agentModeGrid.innerHTML = "";
  for (const mode of modes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "agent-mode-card";
    button.dataset.agentMode = mode.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(mode.id === state.agentMode));
    const shortName = mode.id === "general" ? "General Adviser" : mode.name;
    button.innerHTML =
      `<span class="mode-top"><span class="mode-icon">${icon(mode.icon || "compass", 14)}</span>` +
      `<strong>${escapeHtml(shortName)}</strong></span>` +
      `<small>${escapeHtml(mode.modelLabel || "GPT-5.6")}</small>`;
    button.addEventListener("click", () => selectAgentMode(mode.id));
    els.agentModeGrid.appendChild(button);
  }

  els.agentModeBadge.textContent = active.id === "general" ? "General" : "Synthetic demo";
  const meta = [
    active.modelLabel || "GPT-5.6",
    active.supportsImages ? "Multimodal" : "Text + web",
    "Public web grounded",
    ...(active.id === "general" ? [] : ["Code Interpreter"]),
  ];
  const scenes = active.demoScenes || (active.prompts || []).map((prompt, index) => ({
    label: `${index + 1}. Starter`,
    title: prompt,
    prompt,
  }));
  const promptButtons = scenes.slice(0, 3)
    .map((scene) => `<button type="button" data-demo-prompt="${escapeHtml(scene.prompt)}" title="${escapeHtml(scene.title)}">${escapeHtml(scene.label)} · ${escapeHtml(scene.title)}</button>`)
    .join("");
  const sampleData = active.demoScenes?.[0]?.syntheticData;
  const sampleDataMarkup = sampleData
    ? `<details><summary>Synthetic demo data</summary><dl>${Object.entries(sampleData).map(([key, value]) => `<div><dt>${escapeHtml(key.replace(/([A-Z])/g, " $1"))}</dt><dd>${escapeHtml(String(value))}</dd></div>`).join("")}</dl></details>`
    : "";
  const workflow = active.workflow?.length
    ? `<div class="agent-workflow"><details><summary>6-step workflow</summary><ol>${active.workflow.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol></details>${sampleDataMarkup}</div>`
    : `<div class="agent-workflow"><details><summary>General coaching scope</summary><ol><li>Answer concisely</li><li>Ground material claims</li><li>Expand only when asked</li></ol></details></div>`;
  els.agentModeDetail.innerHTML =
    `<div class="agent-detail-copy"><p><b>${escapeHtml(active.name)}</b> - ${escapeHtml(active.summary)}</p>` +
    `<div class="agent-detail-meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` +
    `<p>${escapeHtml(active.businessValue)}</p><div class="agent-demo-prompts">${promptButtons}</div></div>${workflow}`;
  els.agentModeDetail.querySelectorAll("[data-demo-prompt]").forEach((button) => {
    button.addEventListener("click", () => sendMessage(button.dataset.demoPrompt));
  });

  const canAttach = active.id === "general" || active.supportsImages;
  els.attachBtn.disabled = !canAttach;
  els.attachBtn.title = canAttach
    ? "Attach an image for multimodal analysis"
    : "This agent is designed for text and web-grounded scenarios";
  if (!canAttach) clearAttachment();
  els.briefBtn.innerHTML = icon("brief") + `<span>${active.id === "general" ? "Brief" : "Run demo"}</span>`;
  els.input.placeholder = active.id === "general"
    ? `Ask about ${state.customer.name}...`
    : `Talk to ${active.name}...`;
  els.avatarIdleCopy.textContent = `Turn on voice to talk with the ${active.name}.`;
}

function selectAgentMode(modeId, options = {}) {
  const mode = agentModes().find((item) => item.id === modeId);
  if (!mode || (modeId === state.agentMode && options.force !== true)) return;
  interruptAvatar();
  stopListening();
  state.generation += 1;
  state.busy = false;
  els.sendBtn.disabled = false;
  state.threadId = null;
  state.pending = null;
  state.greeted = false;
  state.roleplayActive = false;
  state.agentMode = mode.id;
  els.roleplayBanner.hidden = true;
  clearAttachment();
  renderAgentModes();
  renderWelcome();
  try { localStorage.setItem(`clientsphere.agentMode.${state.customer.id}`, mode.id); } catch {}
  if (options.announce !== false) {
    toast(`${mode.name} loaded. A fresh ${mode.id === "general" ? "conversation" : "synthetic demo"} is ready.`);
  }
}

function renderWelcome() {
  const customer = state.customer;
  const mode = currentModeDefinition();
  els.messages.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "msg bot welcome";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.id = "welcomeBubble";
  els.welcomeBubble = bubble;
  const intro = document.createElement("p");
  intro.innerHTML = mode.id === "general"
    ? `ClientSphere is focused on <b>${escapeHtml(customer.name)}</b>. Ask a quick question and the adviser will expand only when you request it.`
    : `<b>${escapeHtml(mode.name)}</b> is ready as a synthetic ${escapeHtml(customer.name)} demo. Choose a starter or attach an image where supported.`;
  const chips = document.createElement("div");
  chips.className = "chips";
  const starters = mode.id === "general"
    ? customer.topics.slice(0, 4).map((topic) => `Brief me on ${topic.toLowerCase()} for ${customer.name}, with dates and public sources.`)
    : (mode.demoScenes || []).map((scene) => scene.prompt);
  starters.slice(0, 4).forEach((prompt, index) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.type = "button";
    button.textContent = mode.id === "general"
      ? prompt
      : `${mode.demoScenes[index].label} · ${mode.demoScenes[index].title}`;
    button.addEventListener("click", () => sendMessage(prompt));
    chips.appendChild(button);
  });
  bubble.append(intro, chips);
  wrap.appendChild(bubble);
  els.messages.appendChild(wrap);
}

function renderCustomerOptions(query = "") {
  const needle = query.trim().toLowerCase();
  const matches = state.cfg.customers.filter((customer) =>
    [customer.name, customer.sector, customer.domain].some((value) => value.toLowerCase().includes(needle))
  );
  els.customerOptions.innerHTML = "";
  for (const customer of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "customer-option";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(customer.id === state.customer?.id));

    const logo = document.createElement("span");
    logo.className = "customer-option-logo";
    const img = document.createElement("img");
    img.src = customer.logoUrl;
    img.alt = "";
    const fallback = document.createElement("span");
    fallback.textContent = customer.initials;
    img.onload = () => { fallback.hidden = true; };
    img.onerror = () => { img.hidden = true; fallback.hidden = false; };
    logo.append(img, fallback);

    const copy = document.createElement("span");
    copy.className = "customer-option-copy";
    const name = document.createElement("strong");
    name.textContent = customer.name;
    const meta = document.createElement("span");
    meta.textContent = `${customer.sector} - ${customer.domain}`;
    copy.append(name, meta);
    button.append(logo, copy);
    button.addEventListener("click", () => selectCustomer(customer.id));
    els.customerOptions.appendChild(button);
  }
  els.customerCount.textContent = `${matches.length} of ${state.cfg.customers.length}`;
}

async function selectCustomer(customerId, options = {}) {
  const customer = state.cfg.customers.find((item) => item.id === customerId);
  if (!customer) return;
  interruptAvatar();
  stopListening();
  state.generation += 1;
  state.busy = false;
  els.sendBtn.disabled = false;
  state.threadId = null;
  state.pending = null;
  state.greeted = false;
  state.roleplayActive = false;
  els.roleplayBanner.hidden = true;

  const generation = state.generation;
  const response = await fetch(`/api/customers/${encodeURIComponent(customer.id)}`);
  const data = await response.json();
  if (generation !== state.generation) return;
  if (!response.ok) throw new Error(data.error || "Could not load customer.");
  state.customer = data.customer;
  state.resources = data.resources;
  setCustomerLogo(state.customer);
  els.customerName.textContent = state.customer.name;
  els.customerSector.textContent = state.customer.sector;
  els.drawerTitle.textContent = `${state.customer.name} intelligence`;
  let savedMode = "general";
  try { savedMode = localStorage.getItem(`clientsphere.agentMode.${state.customer.id}`) || "general"; } catch {}
  if (!["general", ...(state.customer.useCases || []).map((useCase) => useCase.id)].includes(savedMode)) savedMode = "general";
  state.agentMode = savedMode;
  clearAttachment();
  renderAgentModes();
  renderWelcome();
  renderResources();
  renderCustomerOptions(els.customerSearch.value);
  try { localStorage.setItem("clientsphere.customer", state.customer.id); } catch {}
  if (els.customerPopover.matches(":popover-open")) els.customerPopover.hidePopover();
  if (options.announce !== false) toast(`${state.customer.name} adviser loaded. New conversation started.`);
}

function renderResources() {
  const groups = state.resources || [];
  els.drawerLinks.innerHTML = "";
  groups.forEach((grp) => {
    const lbl = document.createElement("div");
    lbl.className = "drawer-group-label";
    lbl.textContent = grp.group;
    els.drawerLinks.appendChild(lbl);
    grp.links.forEach((l) => {
      const item = document.createElement(l.url ? "a" : "button");
      item.className = "drawer-link";
      if (l.url) {
        item.href = l.url;
        item.target = "_blank";
        item.rel = "noopener noreferrer";
      } else {
        item.type = "button";
        item.addEventListener("click", () => {
          openDrawer(false);
          if (l.agentMode) selectAgentMode(l.agentMode);
          dispatch(l.prompt, { userText: l.title });
        });
      }
      item.innerHTML = `<span class="dl-ico">${icon(l.icon, 18)}</span><span><span class="dl-title">${l.title}</span><span class="dl-sub">${l.sub}</span></span>`;
      els.drawerLinks.appendChild(item);
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
    `[[ROLEPLAY_START]] Enter roleplay mode for ${state.customer.name}. You are no longer the coach - you are ${persona} at ${state.customer.name}. ` +
    `The user is leading ${product}. Be ${difficulty}. Stay fully in character, speak in first person, ` +
    `react realistically, raise objections, and ask pointed questions. Keep each turn short and conversational. ` +
    `Do NOT coach or break character until you receive [[ROLEPLAY_SCORE]]. Open with a brief, in-character greeting that sets the scene.`;
  dispatch(directive, { userText: `Starting roleplay — ${personaLabel}` });
}
function endRoleplayAndScore() {
  if (!state.roleplayActive) return;
  state.roleplayActive = false;
  els.roleplayBanner.hidden = true;
  const directive =
    `[[ROLEPLAY_SCORE]] Roleplay over - break character and become the ClientSphere coach again. Score the user's performance ` +
    `for Discovery, Customer relevance, Use of evidence, Objection handling, and Next-step quality. Give specific strengths and improvements.`;
  dispatch(directive, { userText: "End & score me" });
}

// ---------- Session recap ----------
function openRecap() {
  openModal("recapModal", true);
  document.getElementById("recapOut").textContent = "Generating your recap…";
  document.getElementById("recapActions").hidden = true;
  const directive =
    "[[SESSION_RECAP]] Produce a concise written recap of THIS session for the seller to keep. " +
    "Use plain text with short sections: Topics covered, Evidence used, Open questions, Action items, and Public source links. " +
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
  a.download = `clientsphere-${state.customer.id}-${state.agentMode}-recap-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function emailRecap() {
  const subject = encodeURIComponent(`ClientSphere recap - ${state.customer.name}`);
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
  if (!confirm("Delete your ClientSphere account? This removes your access and data. The admin will be notified. You can sign up again later.")) return;
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
  els.briefBtn.innerHTML = icon("brief") + "<span>Brief</span>";
  els.recapBtn.innerHTML = icon("recap") + "<span>Recap</span>";
  document.getElementById("aboutBtn").innerHTML = icon("info") + "<span>About</span>";
  els.attachBtn.innerHTML = icon("paperclip", 19);
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
  try { state.responseMode = localStorage.getItem("clientsphere.responseMode") || "brief"; } catch {}
  selectResponseMode(state.responseMode);
  renderCustomerOptions();
  let savedCustomer = state.cfg.defaultCustomerId;
  try { savedCustomer = localStorage.getItem("clientsphere.customer") || savedCustomer; } catch {}
  if (!state.cfg.customers.some((customer) => customer.id === savedCustomer)) savedCustomer = state.cfg.defaultCustomerId;
  await selectCustomer(savedCustomer, { announce: false });
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
  els.responseModeSeg.addEventListener("click", (event) => {
    const button = event.target.closest("[data-response-mode]");
    if (button) selectResponseMode(button.dataset.responseMode);
  });
  els.attachBtn.addEventListener("click", () => els.imageInput.click());
  els.imageInput.addEventListener("change", () => selectImage(els.imageInput.files?.[0]));
  els.attachmentRemove.addEventListener("click", clearAttachment);
  els.micBtn.addEventListener("click", startListening);
  els.stopBtn.addEventListener("click", () => interruptAvatar(true));
  els.genderSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-gender]");
    if (b) setGender(b.dataset.gender);
  });
  els.voiceSelect.addEventListener("change", () => { setVoice(els.voiceSelect.value); });
  els.customerSearch.addEventListener("input", () => renderCustomerOptions(els.customerSearch.value));
  els.customerPopover.addEventListener("toggle", (event) => {
    if (event.newState === "open") {
      els.customerSearch.value = "";
      renderCustomerOptions();
      setTimeout(() => els.customerSearch.focus(), 0);
    }
  });
  // Customer intelligence drawer
  els.drawerToggle.addEventListener("click", () => openDrawer(true));
  els.drawerClose.addEventListener("click", () => openDrawer(false));
  els.drawerScrim.addEventListener("click", () => openDrawer(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") openDrawer(false); });

  // Feature toolbar
  els.roleplayBtn.addEventListener("click", () => openModal("roleplayModal", true));
  els.briefBtn.addEventListener("click", () => {
    const mode = currentModeDefinition();
    if (mode.id === "general") {
      dispatch("[[CUSTOMER_BRIEF]] Build an evidence-led executive briefing for the active customer.", { userText: "Build customer brief", speak: false });
    } else {
      sendMessage(`Run a complete synthetic demonstration of the ${mode.name} workflow for ${state.customer.name}. Make the synthetic inputs, six workflow steps, human controls, business value, measures, and next proof point visible.`);
    }
  });
  els.recapBtn.addEventListener("click", openRecap);
  document.getElementById("aboutBtn").addEventListener("click", () => openModal("aboutModal", true));
  els.roleplayEndBtn.addEventListener("click", endRoleplayAndScore);
  document.getElementById("rpStartBtn").addEventListener("click", startRoleplay);
  document.getElementById("recapCopyBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(state.lastRecap || "").then(() => toast("Recap copied to clipboard."));
  });
  document.getElementById("recapDownloadBtn").addEventListener("click", downloadRecap);
  document.getElementById("recapEmailBtn").addEventListener("click", emailRecap);
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
