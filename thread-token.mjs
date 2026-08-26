import crypto from "node:crypto";

function signature(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createThreadToken({ customerId, threadId, userLogin }, secret) {
  if (!customerId || !threadId || !userLogin || !secret) throw new Error("Thread token fields and secret are required.");
  const payload = Buffer.from(JSON.stringify({
    customerId,
    threadId,
    userLogin: userLogin.toLowerCase(),
  })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyThreadToken(token, { customerId, userLogin }, secret) {
  if (!token || !customerId || !userLogin || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, supplied] = parts;
  const expected = signature(payload, secret);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (value.customerId !== customerId ||
        value.userLogin !== userLogin.toLowerCase() ||
        !value.threadId) return null;
    return value.threadId;
  } catch {
    return null;
  }
}
