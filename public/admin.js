// ClientSphere admin dashboard: access requests, usage, system logs.
const el = (id) => document.getElementById(id);

function toast(msg) {
  const t = el("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 3000);
}
function esc(s) { return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function ago(iso) {
  if (!iso) return "—";
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return Math.floor(d / 60) + "m ago";
  if (d < 86400) return Math.floor(d / 3600) + "h ago";
  return Math.floor(d / 86400) + "d ago";
}

async function api(path, body) {
  const res = await fetch(path, body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { toast(data.error || "Action failed"); return null; }
  return data;
}

async function decide(login, decision) { if (await api("/api/admin/decide", { login, decision })) { toast(`@${login} → ${decision}`); load(); } }
async function delUser(login) { if (!confirm(`Delete @${login}? This removes their account and data.`)) return; if (await api("/api/admin/delete", { login })) { toast(`@${login} deleted`); load(); } }
async function setAdmin(login, makeAdmin) { if (await api("/api/admin/set-admin", { login, makeAdmin })) { toast(`@${login} ${makeAdmin ? "promoted to admin" : "admin removed"}`); load(); } }

function statusBadge(u) {
  const admin = u.effectiveAdmin ? '<span class="badge admin">admin</span>' : "";
  return `<span class="badge ${u.status}">${u.status}</span>${admin}`;
}
function rowActions(u) {
  if (u.bootstrapAdmin) return '<span class="muted" style="font-size:12px;">owner</span>';
  const b = [];
  if (u.status !== "approved") b.push(`<button class="act approve" data-l="${esc(u.login)}" data-a="approve">Approve</button>`);
  if (u.status !== "denied") b.push(`<button class="act deny" data-l="${esc(u.login)}" data-a="deny">Deny</button>`);
  if (u.effectiveAdmin) b.push(`<button class="act revoke" data-l="${esc(u.login)}" data-a="unadmin">Remove admin</button>`);
  else b.push(`<button class="act admin-make" data-l="${esc(u.login)}" data-a="makeadmin">Make admin</button>`);
  b.push(`<button class="act del" data-l="${esc(u.login)}" data-a="delete">Delete</button>`);
  return `<div class="row-actions">${b.join("")}</div>`;
}

async function toggleAvatar(id, visible) {
  const res = await api("/api/admin/avatars/visibility", { id, visible });
  if (res) { toast(`${visible ? "Shown to users" : "Hidden"}`); renderAvatars(res); }
}
function avatarCheckRow(a) {
  const star = a.kind === "custom" ? "⭐ " : "";
  const meta = a.kind === "custom"
    ? `${esc(a.character || "")}${a.photoModel ? " · " + esc(a.photoModel) : ""}`
    : "built-in voice";
  return `<label class="av-check ${a.hidden ? "" : "on"}">
    <input type="checkbox" ${a.hidden ? "" : "checked"} data-id="${esc(a.id)}"/>
    <span class="av-box"></span>
    <span class="av-text"><span class="av-name">${star}${esc(a.label || a.id)}</span><span class="av-meta">${meta}</span></span>
  </label>`;
}
function renderAvatars(data) {
  const female = (data && data.female) || [];
  const male = (data && data.male) || [];
  const card = el("avatarsCard");
  if (!female.length && !male.length) { if (card) card.hidden = true; return; }
  if (card) card.hidden = false;
  el("avatarsFemale").innerHTML = female.map(avatarCheckRow).join("") || '<div class="muted">None</div>';
  el("avatarsMale").innerHTML = male.map(avatarCheckRow).join("") || '<div class="muted">None</div>';
  el("avatarsCard").querySelectorAll("input[type=checkbox]").forEach((cb) =>
    cb.addEventListener("change", () => toggleAvatar(cb.dataset.id, cb.checked)));
}

// Client-side pagination state (preserved across the 20s auto-reload).
const PAGE_SIZE = 15;
const pager = { logs: 0, feed: 0 };
function renderPaged(containerId, pagerKey, items, rowHtml, emptyHtml) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pager[pagerKey] >= pages) pager[pagerKey] = pages - 1;
  if (pager[pagerKey] < 0) pager[pagerKey] = 0;
  const start = pager[pagerKey] * PAGE_SIZE;
  const slice = items.slice(start, start + PAGE_SIZE);
  const body = el(containerId);
  body.innerHTML = slice.length ? slice.map(rowHtml).join("") : emptyHtml;
  const meta = el(pagerKey + "Pager");
  if (meta) {
    if (total <= PAGE_SIZE) { meta.innerHTML = ""; return; }
    const from = start + 1, to = Math.min(start + PAGE_SIZE, total);
    meta.innerHTML =
      `<button class="pg-btn" data-k="${pagerKey}" data-d="-1" ${pager[pagerKey] === 0 ? "disabled" : ""}>‹ Prev</button>` +
      `<span class="pg-info">${from}–${to} of ${total}</span>` +
      `<button class="pg-btn" data-k="${pagerKey}" data-d="1" ${pager[pagerKey] >= pages - 1 ? "disabled" : ""}>Next ›</button>`;
    meta.querySelectorAll("button.pg-btn").forEach((b) => b.addEventListener("click", () => {
      pager[b.dataset.k] += parseInt(b.dataset.d, 10);
      window._lastData && window._lastData();
    }));
  }
}

async function load() {
  const me = await fetch("/api/me").then((r) => (r.ok ? r.json() : null));
  if (!me || !me.isAdmin) { location.href = "/login"; return; }
  el("adminWho").textContent = `Signed in as ${me.name} (@${me.login}) — admin`;

  const [uRes, gRes, lRes, aRes] = await Promise.all([
    fetch("/api/admin/users").then((r) => r.json()),
    fetch("/api/admin/usage").then((r) => r.json()),
    fetch("/api/admin/logs").then((r) => r.json()),
    fetch("/api/admin/avatars").then((r) => r.json()).catch(() => ({ female: [], male: [] })),
  ]);
  const users = uRes.users || [];
  renderAvatars(aRes);

  const pending = users.filter((u) => u.status === "pending").length;
  const approved = users.filter((u) => u.status === "approved").length;
  const denied = users.filter((u) => u.status === "denied").length;
  el("kpis").innerHTML = [
    ["blue", users.length, "Total users"],
    ["amber", pending, "Pending review"],
    ["green", approved, "Approved"],
    ["", denied, "Denied"],
  ].map(([c, v, k]) => `<div class="kpi ${c}"><div class="v">${v}</div><div class="k">${k}</div></div>`).join("");

  const order = { pending: 0, approved: 1, denied: 2 };
  users.sort((a, b) => (order[a.status] - order[b.status]) || (b.requestedAt || "").localeCompare(a.requestedAt || ""));
  el("usersMeta").textContent = `${users.length} total`;
  el("usersBody").innerHTML = users.map((u) => `
    <tr>
      <td><div class="user-cell">
        <img src="${esc(u.avatar) || "favicon.svg"}" alt="" onerror="this.src='favicon.svg'"/>
        <div><div>${esc(u.name)}</div><div class="login">@${esc(u.login)}</div></div>
      </div></td>
      <td>${u.email ? `<a href="mailto:${esc(u.email)}" style="color:#c4b5fd;text-decoration:none;">${esc(u.email)}</a>` : '<span class="muted">private</span>'}</td>
      <td>${statusBadge(u)}</td>
      <td class="muted">${ago(u.requestedAt)}</td>
      <td class="muted">${ago(u.lastLoginAt)}</td>
      <td>${rowActions(u)}</td>
    </tr>`).join("") || `<tr><td colspan="6" class="muted" style="padding:20px;">No users yet.</td></tr>`;

  el("usersBody").querySelectorAll("button.act").forEach((b) => b.addEventListener("click", () => {
    const l = b.dataset.l, a = b.dataset.a;
    if (a === "approve") decide(l, "approved");
    else if (a === "deny") decide(l, "denied");
    else if (a === "delete") delUser(l);
    else if (a === "makeadmin") setAdmin(l, true);
    else if (a === "unadmin") setAdmin(l, false);
  }));

  const stats = gRes.stats || [];
  el("usageBody").innerHTML = stats.map((s) => `
    <tr><td>@${esc(s.login)}</td><td>${s.total}</td><td>${s.chats}</td><td class="muted">${ago(s.lastActive)}</td></tr>
  `).join("") || `<tr><td colspan="4" class="muted" style="padding:20px;">No usage yet.</td></tr>`;

  const logs = lRes.logs || [];
  renderPaged("logsBody", "logs", logs,
    (e) => `<tr><td class="muted" style="white-space:nowrap;">${new Date(e.ts).toLocaleString()}</td>
    <td><span class="badge ${e.level === "warn" ? "denied" : e.level === "error" ? "denied" : "approved"}">${esc(e.level)}</span></td>
    <td>${esc(e.message)}</td><td class="muted">${esc(e.detail)}</td></tr>`,
    `<tr><td colspan="4" class="muted" style="padding:20px;">No logs yet.</td></tr>`);

  const recent = gRes.recent || [];
  renderPaged("feed", "feed", recent,
    (e) => `<div class="feed-row"><span class="t">${new Date(e.ts).toLocaleString()}</span>
    <span class="a">${esc(e.action)}</span>
    <span>@${esc(e.login)}${e.detail ? ` · ${esc(e.detail)}` : ""}</span></div>`,
    `<div class="muted" style="padding:8px 0;">No activity yet.</div>`);
}
window._lastData = load;

load();
setInterval(load, 20000);
