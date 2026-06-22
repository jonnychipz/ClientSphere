// admin.js — Hubble admin dashboard: review access requests + usage.
const el = (id) => document.getElementById(id);
let ADMINS = [];

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
function isAdmin(login) { return ADMINS.includes((login || "").toLowerCase()); }

async function decide(login, decision) {
  const res = await fetch("/api/admin/decide", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, decision }),
  });
  const data = await res.json();
  if (!res.ok) { toast(data.error || "Failed"); return; }
  toast(`@${login} → ${decision}`);
  load();
}

function statusBadge(u) {
  const admin = isAdmin(u.login) ? '<span class="badge admin">admin</span>' : "";
  return `<span class="badge ${u.status}">${u.status}</span>${admin}`;
}
function rowActions(u) {
  if (isAdmin(u.login)) return '<span class="muted" style="font-size:12px;">—</span>';
  const b = [];
  if (u.status !== "approved") b.push(`<button class="act approve" data-l="${esc(u.login)}" data-d="approved">Approve</button>`);
  if (u.status !== "denied") b.push(`<button class="act deny" data-l="${esc(u.login)}" data-d="denied">Deny</button>`);
  if (u.status === "approved") b.push(`<button class="act revoke" data-l="${esc(u.login)}" data-d="pending">Revoke</button>`);
  return `<div class="row-actions">${b.join("")}</div>`;
}

async function load() {
  const me = await fetch("/api/me").then((r) => (r.ok ? r.json() : null));
  if (!me || !me.isAdmin) { location.href = "/login"; return; }
  el("adminWho").textContent = `Signed in as ${me.name} (@${me.login}) — admin`;

  const [uRes, gRes] = await Promise.all([
    fetch("/api/admin/users").then((r) => r.json()),
    fetch("/api/admin/usage").then((r) => r.json()),
  ]);
  ADMINS = (uRes.admins || []).map((a) => a.toLowerCase());
  const users = uRes.users || [];

  // KPIs
  const pending = users.filter((u) => u.status === "pending").length;
  const approved = users.filter((u) => u.status === "approved").length;
  const denied = users.filter((u) => u.status === "denied").length;
  el("kpis").innerHTML = [
    ["blue", users.length, "Total users"],
    ["amber", pending, "Pending review"],
    ["green", approved, "Approved"],
    ["", denied, "Denied"],
  ].map(([c, v, k]) => `<div class="kpi ${c}"><div class="v">${v}</div><div class="k">${k}</div></div>`).join("");

  // Users table — pending first
  const order = { pending: 0, approved: 1, denied: 2 };
  users.sort((a, b) => (order[a.status] - order[b.status]) || (b.requestedAt || "").localeCompare(a.requestedAt || ""));
  el("usersMeta").textContent = `${users.length} total`;
  el("usersBody").innerHTML = users.map((u) => `
    <tr>
      <td><div class="user-cell">
        <img src="${esc(u.avatar) || "favicon.svg"}" alt="" onerror="this.src='favicon.svg'"/>
        <div><div>${esc(u.name)}</div><div class="login">@${esc(u.login)}</div></div>
      </div></td>
      <td>${statusBadge(u)}</td>
      <td class="muted">${ago(u.requestedAt)}</td>
      <td class="muted">${ago(u.lastLoginAt)}</td>
      <td>${rowActions(u)}</td>
    </tr>`).join("") || `<tr><td colspan="5" class="muted" style="padding:20px;">No users yet.</td></tr>`;

  el("usersBody").querySelectorAll("button.act").forEach((b) =>
    b.addEventListener("click", () => decide(b.dataset.l, b.dataset.d)));

  // Usage
  const stats = gRes.stats || [];
  el("usageBody").innerHTML = stats.map((s) => `
    <tr><td>@${esc(s.login)}</td><td>${s.total}</td><td>${s.chats}</td><td class="muted">${ago(s.lastActive)}</td></tr>
  `).join("") || `<tr><td colspan="4" class="muted" style="padding:20px;">No usage yet.</td></tr>`;

  // Recent feed
  el("feed").innerHTML = (gRes.recent || []).slice(0, 40).map((e) => `
    <div class="feed-row"><span class="t">${new Date(e.ts).toLocaleString()}</span>
    <span class="a">${esc(e.action)}</span>
    <span>@${esc(e.login)}${e.detail ? ` · ${esc(e.detail)}` : ""}</span></div>
  `).join("") || `<div class="muted" style="padding:8px 0;">No activity yet.</div>`;
}

load();
setInterval(load, 20000); // refresh every 20s
