// app.js — Hubble client: chat + real-time talking avatar + speech-to-text.
const SDK = window.SpeechSDK;

const els = {
  messages: document.getElementById("messages"),
  composer: document.getElementById("composer"),
  input: document.getElementById("input"),
  sendBtn: document.getElementById("sendBtn"),
  micBtn: document.getElementById("micBtn"),
  voiceToggle: document.getElementById("voiceToggle"),
  voiceToggleLbl: document.querySelector("#voiceToggle .lbl b"),
  genderSeg: document.getElementById("genderSeg"),
  voiceSelect: document.getElementById("voiceSelect"),
  video: document.getElementById("avatarVideo"),
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
  voiceOn: false,
  speechConfig: null,
  tokenInfo: null,
  avatarSynth: null,
  peer: null,
  avatarLive: false,
  recognizer: null,
  listening: false,
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

// ---------- rendering ----------
function addMessage(role, text, citations) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "bot");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
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
async function sendMessage(text) {
  text = (text || "").trim();
  if (!text) return;
  addMessage("user", text);
  els.input.value = "";
  els.input.style.height = "auto";
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
    els.sendBtn.disabled = false;
    els.input.focus();
  }
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

async function speak(text) {
  if (!state.avatarSynth) return;
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">` +
    `<voice name="${state.voice}">${escapeXml(speakable(text))}</voice></speak>`;
  els.speakingBar.classList.add("on");
  try {
    await state.avatarSynth.speakSsmlAsync(ssml);
  } catch (e) {
    console.warn("speak failed", e);
  } finally {
    els.speakingBar.classList.remove("on");
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

  const avatarInfo = state.cfg.avatars[state.gender];
  const videoFormat = new SDK.AvatarVideoFormat();
  const avatarConfig = new SDK.AvatarConfig(avatarInfo.character, avatarInfo.style, videoFormat);
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
      els.video.classList.add("show");
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
  } else {
    throw new Error("Avatar failed to start (reason " + result.reason + ")");
  }
}

function stopAvatar() {
  try { state.avatarSynth && state.avatarSynth.close(); } catch {}
  try { state.peer && state.peer.close(); } catch {}
  state.avatarSynth = null;
  state.peer = null;
  state.avatarLive = false;
  els.video.classList.remove("show");
  els.video.srcObject = null;
  els.idle.classList.remove("hide");
  els.speakingBar.classList.remove("on");
  setStatus("offline");
}

// ---------- voice toggle ----------
async function setVoiceOn(on) {
  state.voiceOn = on;
  els.voiceToggle.setAttribute("aria-checked", String(on));
  els.voiceToggleLbl.textContent = on ? "On" : "Off";
  if (on) {
    try {
      toast("Waking Hubble's avatar… this can take a few seconds.");
      await startAvatar();
      els.micBtn.disabled = false;
      toast("Voice assistant is live. Click the mic to talk, or just type.");
    } catch (e) {
      console.error(e);
      toast("Couldn't start the avatar: " + e.message);
      state.voiceOn = false;
      els.voiceToggle.setAttribute("aria-checked", "false");
      els.voiceToggleLbl.textContent = "Off";
      stopAvatar();
    }
  } else {
    stopAvatar();
    els.micBtn.disabled = true;
    stopListening();
  }
}

// ---------- speech-to-text ----------
async function startListening() {
  if (state.listening) return stopListening();
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

// ---------- gender / voice pickers ----------
function populateVoices() {
  const list = state.cfg.voices[state.gender];
  els.voiceSelect.innerHTML = "";
  list.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    els.voiceSelect.appendChild(opt);
  });
  state.voice = state.cfg.avatars[state.gender].defaultVoice || list[0].id;
  els.voiceSelect.value = state.voice;
}

async function setGender(g) {
  if (g === state.gender) return;
  state.gender = g;
  [...els.genderSeg.children].forEach((b) => b.classList.toggle("active", b.dataset.gender === g));
  populateVoices();
  if (state.voiceOn) {
    stopAvatar();
    try { await startAvatar(); } catch (e) { toast("Avatar restart failed: " + e.message); }
  }
}

// ---------- init ----------
async function init() {
  if (!SDK) { toast("Speech SDK failed to load."); }
  const r = await fetch("/api/config");
  state.cfg = await r.json();
  els.tagline.textContent = state.cfg.tagline;
  populateVoices();

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
  els.genderSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-gender]");
    if (b) setGender(b.dataset.gender);
  });
  els.voiceSelect.addEventListener("change", () => { state.voice = els.voiceSelect.value; });
  document.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => sendMessage(c.textContent))
  );

  // keep the speech auth token fresh for long sessions
  setInterval(() => { if (state.speechConfig) refreshToken().catch(() => {}); }, 8 * 60 * 1000);
}

init();
