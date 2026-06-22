// app.js — Hubble client: chat + real-time talking avatar + speech-to-text.
const SDK = window.SpeechSDK;

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
  body: null,          // { character, style } paired with the chosen voice
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
  pendingText: null,
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
// never fire a second /api/chat while one is in flight. A new message that
// arrives mid-run is held as the single pending item and sent when the run ends.
async function sendMessage(text) {
  text = (text || "").trim();
  if (!text) return;
  // Barge-in: a new question (typed or spoken) interrupts the avatar mid-sentence
  // and refocuses on what was just asked — context is preserved by the thread.
  interruptAvatar();
  stopListening();
  // Detect "I'm wrapping up" intent so we don't reopen the mic after the reply.
  state.endCall = isEndingIntent(text);
  addMessage("user", text);
  els.input.value = "";
  els.input.style.height = "auto";
  if (state.busy) { state.pendingText = text; return; } // queue until current run finishes
  runChat(text);
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

async function runChat(text) {
  state.busy = true;
  const typing = addTyping();
  els.sendBtn.disabled = true;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, threadId: state.threadId }),
    });
    const data = await res.json();
    typing.remove();
    if (!res.ok) {
      addMessage("bot", "⚠️ " + (data.error || "Something went wrong.") + (data.detail ? "\n" + data.detail : ""));
      return;
    }
    state.threadId = data.threadId;
    addMessage("bot", data.reply, data.citations);
    if (state.voiceOn && state.avatarLive) speak(data.reply);
  } catch (err) {
    typing.remove();
    addMessage("bot", "⚠️ Network error: " + err.message);
  } finally {
    state.busy = false;
    els.sendBtn.disabled = false;
    els.input.focus();
    // Send whatever the user queued while we were busy.
    if (state.pendingText) {
      const next = state.pendingText;
      state.pendingText = null;
      runChat(next);
    }
  }
}

// First-contact greeting: Hubble introduces itself and asks the seller's name,
// then (via speak → auto-listen) opens the mic so they can just answer aloud.
function kickoffGreeting() {
  if (state.greeted) return;
  state.greeted = true;
  runChat("[SYSTEM: The seller just turned on voice mode and hasn't spoken yet. Greet them warmly in one or two short sentences and ask their first name. Don't cover anything else yet.]");
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
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">` +
    `<voice name="${state.voice}">${escapeXml(speakable(text))}</voice></speak>`;
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

  const body = state.body || { character: "lisa", style: "graceful-standing" };
  const videoFormat = new SDK.AvatarVideoFormat();
  const avatarConfig = new SDK.AvatarConfig(body.character, body.style, videoFormat);
  // Render on a flat green backdrop so we can chroma-key it out and show any
  // background behind the avatar.
  avatarConfig.backgroundColor = state.green;
  state.speechConfig.speechSynthesisVoiceName = state.voice;

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
function currentVoiceObj() {
  return state.cfg.voices[state.gender].find((v) => v.id === state.voice) || state.cfg.voices[state.gender][0];
}
function applyBodyFromVoice() {
  const v = currentVoiceObj();
  state.voice = v.id;
  state.body = { character: v.character, style: v.style };
}
function populateVoices() {
  const list = state.cfg.voices[state.gender];
  els.voiceSelect.innerHTML = "";
  list.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    els.voiceSelect.appendChild(opt);
  });
  state.voice = list[0].id;
  els.voiceSelect.value = state.voice;
  applyBodyFromVoice();
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

async function setVoice(voiceId) {
  state.voice = voiceId;
  applyBodyFromVoice(); // changing voice also changes the body
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
      a.innerHTML = `<span class="dl-ico">${l.icon}</span><span><span class="dl-title">${l.title}</span><span class="dl-sub">${l.sub}</span></span>`;
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

// ---------- init ----------
async function init() {
  if (!SDK) { toast("Speech SDK failed to load."); }
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

  // keep the speech auth token fresh for long sessions
  setInterval(() => { if (state.speechConfig) refreshToken().catch(() => {}); }, 8 * 60 * 1000);
}

init();
