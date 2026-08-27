// email.mjs — transactional emails via Azure Communication Services (ACS) Email.
// Sends: admin new-user notification (with Approve/Deny), user pending, and
// user approved/denied. No-ops gracefully if ACS isn't configured (local dev).
import { EmailClient } from "@azure/communication-email";

const CONN = process.env.ACS_CONNECTION_STRING || "";
const SENDER = process.env.EMAIL_SENDER || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_NAME = process.env.ADMIN_NAME || "ClientSphere administrator";

export const EMAIL_ENABLED = !!(CONN && SENDER);
const client = EMAIL_ENABLED ? new EmailClient(CONN) : null;

const PURPLE = "#8b5cf6";
const PURPLE_LT = "#a78bfa";
const INK = "#14101f";
const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function send(to, subject, html, attachments) {
  if (!EMAIL_ENABLED) { console.log(`[email disabled] would send "${subject}" to ${to}`); return false; }
  if (!to) { console.log(`[email] no recipient for "${subject}"`); return false; }
  try {
    const message = {
      senderAddress: SENDER,
      content: { subject, html },
      recipients: { to: [{ address: to }] },
    };
    if (attachments && attachments.length) message.attachments = attachments;
    const poller = await client.beginSend(message);
    await poller.pollUntilDone();
    return true;
  } catch (err) {
    console.error("email send error:", err.message);
    return false;
  }
}

// Build an avatar block for the email. Remote images (e.g. GitHub avatars) are
// blocked by default in many corporate mail clients, so we fetch the image
// server-side and embed it INLINE as a CID attachment. Falls back to an
// initials circle if the avatar can't be fetched. Returns { html, attachment }.
async function avatarBlock(user, sizePx = 56) {
  const initials = (user.name || user.login || "?")
    .split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  const fallback = `<div style="width:${sizePx}px;height:${sizePx}px;border-radius:50%;border:2px solid ${PURPLE};background:linear-gradient(145deg,#2a2150,#140f26);color:#d8c9ff;font-weight:700;font-size:${Math.round(sizePx/2.4)}px;line-height:${sizePx}px;text-align:center;">${esc(initials)}</div>`;
  let url = user.avatar || "";
  if (!url) return { html: fallback, attachment: null };
  // Ask GitHub for an appropriately sized avatar.
  if (/githubusercontent\.com/.test(url)) url += (url.includes("?") ? "&" : "?") + `s=${sizePx * 2}`;
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return { html: fallback, attachment: null };
    const ct = r.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > 2_000_000) return { html: fallback, attachment: null };
    const cid = "ghavatar";
    const attachment = {
      name: "avatar.png",
      contentType: ct,
      contentInBase64: buf.toString("base64"),
      contentId: cid, // inline reference via src="cid:ghavatar"
    };
    const html = `<img src="cid:${cid}" width="${sizePx}" height="${sizePx}" alt="${esc(user.login || "")}" style="border-radius:50%;border:2px solid ${PURPLE};display:block;"/>`;
    return { html, attachment };
  } catch {
    return { html: fallback, attachment: null };
  }
}

// ---------- shared chrome ----------
function shell(innerHtml, preheader = "") {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <title>ClientSphere</title></head>
  <body style="margin:0;padding:0;background:#0a0813;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#ece9f6;">
  <span style="display:none;opacity:0;color:#0a0813;font-size:1px;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0813;padding:28px 12px;">
   <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${INK};border:1px solid rgba(139,92,246,0.35);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <tr><td style="height:4px;background:linear-gradient(90deg,${PURPLE_LT},${PURPLE},#6d28d9);"></td></tr>
      <tr><td style="padding:26px 30px 6px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:46px;vertical-align:middle;">
            <div style="width:42px;height:42px;border-radius:11px;background:linear-gradient(145deg,#1c1633,#0e0a1a);text-align:center;line-height:42px;box-shadow:0 0 18px rgba(139,92,246,0.5);">
              <span style="color:#fff;font-size:20px;">&#9670;</span>
            </div>
          </td>
          <td style="padding-left:12px;vertical-align:middle;">
            <div style="font-family:'Segoe UI',Arial;font-weight:800;letter-spacing:-0.4px;font-size:22px;color:${PURPLE_LT};">ClientSphere</div>
            <div style="font-size:12px;color:#9a92b8;">Your AI customer conversation coach</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 30px 26px;">${innerHtml}</td></tr>
      <tr><td style="padding:18px 30px;border-top:1px solid rgba(139,92,246,0.2);background:#100b1c;">
        <div style="font-size:12px;color:#9a92b8;line-height:1.6;">
          <strong style="color:#c4b5fd;">Point of contact</strong><br/>
          ${esc(ADMIN_NAME)}${ADMIN_EMAIL ? `<br/><a href="mailto:${esc(ADMIN_EMAIL)}" style="color:${PURPLE_LT};text-decoration:none;">${esc(ADMIN_EMAIL)}</a>` : ""}
        </div>
      </td></tr>
    </table>
    <div style="font-size:11px;color:#5b5470;margin-top:14px;">ClientSphere · customer intelligence · built on Azure AI Foundry</div>
   </td></tr>
  </table></body></html>`;
}

function btn(href, label, kind = "primary") {
  const style = kind === "primary"
    ? `background:linear-gradient(135deg,${PURPLE_LT},#6d28d9);color:#fff;`
    : `background:#1b1630;color:#ece9f6;border:1px solid rgba(139,92,246,0.4);`;
  return `<a href="${href}" style="display:inline-block;${style}text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">${esc(label)}</a>`;
}
function h(t) { return `<div style="font-size:20px;font-weight:700;color:#fff;margin:0 0 10px;">${esc(t)}</div>`; }
function p(t) { return `<div style="font-size:14px;color:#cfc8e6;line-height:1.65;margin:0 0 14px;">${t}</div>`; }

// ---------- admin: new user wants access ----------
export async function emailAdminNewUser(user, approveUrl, denyUrl, appUrl) {
  const since = user.githubCreatedAt ? new Date(user.githubCreatedAt).getFullYear() : "—";
  const rows = [
    ["Name", esc(user.name)],
    ["GitHub", `<a href="${esc(user.htmlUrl)}" style="color:${PURPLE_LT};text-decoration:none;">@${esc(user.login)}</a>`],
    ["Email", user.email ? `<a href="mailto:${esc(user.email)}" style="color:${PURPLE_LT};text-decoration:none;">${esc(user.email)}</a>` : "<span style='color:#9a92b8'>private</span>"],
    ["Company", esc(user.company) || "—"],
    ["Location", esc(user.location) || "—"],
    ["Bio", esc(user.bio) || "—"],
    ["Public repos", String(user.publicRepos ?? "—")],
    ["Followers", String(user.followers ?? "—")],
    ["On GitHub since", String(since)],
  ].map(([k, v]) => `<tr><td style="padding:6px 0;color:#9a92b8;font-size:13px;width:130px;vertical-align:top;">${k}</td><td style="padding:6px 0;color:#ece9f6;font-size:13px;">${v}</td></tr>`).join("");

  const av = await avatarBlock(user, 56);
  const card = `
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1b1630;border:1px solid rgba(139,92,246,0.3);border-radius:12px;margin:0 0 18px;">
     <tr><td style="padding:18px;">
       <table role="presentation" cellpadding="0" cellspacing="0"><tr>
         <td style="width:64px;vertical-align:top;">
           ${av.html}
         </td>
         <td style="padding-left:14px;">
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
         </td>
       </tr></table>
     </td></tr>
   </table>`;

  const inner = h("New access request") +
    p(`<strong style="color:#fff;">@${esc(user.login)}</strong> just signed in to ClientSphere and is awaiting your approval. Here's what GitHub tells us about them:`) +
    card +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
       <td style="padding-right:10px;">${btn(approveUrl, "✓ Approve access", "primary")}</td>
       <td>${btn(denyUrl, "Deny", "secondary")}</td>
     </tr></table>` +
    p(`<span style="font-size:12px;color:#9a92b8;">Each button opens a quick confirmation page — your decision only applies after you click <b>Confirm</b> there, so link scanners can't approve or deny on your behalf. Or manage everyone in the <a href="${appUrl}/admin" style="color:${PURPLE_LT};">admin dashboard</a>. These one-time links expire in 14 days.</span>`);

  return send(ADMIN_EMAIL, `ClientSphere · @${user.login} requested access`, shell(inner, `${user.name} (@${user.login}) requested access to ClientSphere`), av.attachment ? [av.attachment] : undefined);
}

// ---------- user: request received ----------
export async function emailUserPending(user, appUrl) {
  if (!user.email) return false;
  const inner = h(`Thanks${user.name ? ", " + esc(user.name.split(" ")[0]) : ""}! 👋`) +
    p("Your request to use <strong style='color:#fff;'>ClientSphere</strong> has been received and is <strong style='color:#c4b5fd;'>pending review</strong> by an admin.") +
    p("You'll get another email the moment your access is approved. It's usually quick.") +
    p(`<a href="${appUrl}" style="color:${PURPLE_LT};">Open ClientSphere</a> any time to check your status.`);
  return send(user.email, "ClientSphere · your access request was received", shell(inner, "Your ClientSphere access request is pending review"));
}

// ---------- user: approved / denied ----------
export async function emailUserDecision(user, decision, appUrl) {
  if (!user.email) return false;
  if (decision === "approved") {
    const inner = h("You're in! 🎉") +
      p("Great news - your access to <strong style='color:#fff;'>ClientSphere</strong> has been <strong style='color:#a78bfa;'>approved</strong>. You can now sign in.") +
      `<div style="margin:6px 0 16px;">${btn(appUrl, "Launch ClientSphere", "primary")}</div>` +
      p("Ask about any GitHub product, pricing in multiple currencies, or licensing — or run a live roleplay and get scored. Have fun out there.");
    return send(user.email, "ClientSphere · your access is approved", shell(inner, "Your ClientSphere access has been approved"));
  }
  const inner = h("Access update") +
    p("Thanks for your interest in <strong style='color:#fff;'>ClientSphere</strong>. Your access request wasn't approved at this time.") +
    p("If you think this was a mistake or your situation changes, just reach out to the contact below and we'll take another look.");
  return send(user.email, "ClientSphere · access request update", shell(inner, "An update on your ClientSphere access request"));
}

// ---------- admin: an account was deleted (self-service or by an admin) ----------
export async function emailAdminAccountDeleted(user, appUrl, mode = "self", byLogin = "") {
  const who = mode === "admin"
    ? `<strong style="color:#fff;">@${esc(user.login)}</strong>${user.name ? ` (${esc(user.name)})` : ""} was <strong style="color:#f0a35e;">removed from ClientSphere</strong>${byLogin ? ` by <strong style="color:#fff;">@${esc(byLogin)}</strong>` : ""}.`
    : `<strong style="color:#fff;">@${esc(user.login)}</strong>${user.name ? ` (${esc(user.name)})` : ""} just <strong style="color:#f0a35e;">deleted their account</strong> and removed their data from ClientSphere.`;
  const inner = h("Account deleted") +
    p(who) +
    p(`<span style="font-size:13px;color:#9a92b8;">Email: ${user.email ? esc(user.email) : "private"} · they can sign up again any time and you'll be notified to review.</span>`) +
    `<div style="margin:6px 0 4px;">${btn(appUrl + "/admin", "Open admin dashboard", "secondary")}</div>`;
  return send(ADMIN_EMAIL, `ClientSphere · @${user.login} account deleted`, shell(inner, `@${user.login} account was deleted from ClientSphere`));
}

// ---------- user: confirmation that their account was deleted ----------
export async function emailUserAccountDeleted(user, appUrl, mode = "self") {
  if (!user.email) return false;
  const first = user.name ? ", " + esc(user.name.split(" ")[0]) : "";
  const inner = mode === "admin"
    ? h("Your ClientSphere access was removed") +
      p(`Hi${first}, your <strong style="color:#fff;">ClientSphere</strong> account and associated data have been <strong style="color:#f0a35e;">removed</strong> by an administrator.`) +
      p("If you believe this was a mistake or you'd like access again, just reach out to the contact below — or sign up again any time.") +
      `<div style="margin:6px 0 4px;">${btn(appUrl, "Sign up again", "secondary")}</div>`
    : h("Your account was deleted") +
      p(`Hi${first}, this confirms your <strong style="color:#fff;">ClientSphere</strong> account and associated data have been <strong style="color:#a78bfa;">deleted</strong> as you requested.`) +
      p("Sorry to see you go! You're welcome back any time — just sign up again and an admin will re-approve you.") +
      `<div style="margin:6px 0 4px;">${btn(appUrl, "Return to ClientSphere", "secondary")}</div>`;
  const subject = mode === "admin" ? "ClientSphere · your access has been removed" : "ClientSphere · your account has been deleted";
  return send(user.email, subject, shell(inner, "Your ClientSphere account has been deleted"));
}
