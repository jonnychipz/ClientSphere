export function isApprovedAdmin(user) {
  return Boolean(user && user.status === "approved" && user.isAdmin === true);
}

export function approvedAdmins(users) {
  return (users || []).filter(isApprovedAdmin);
}

export function registrationDisposition(users, login, configuredAdminLogins = []) {
  const allUsers = users || [];
  const hasAdmin = approvedAdmins(allUsers).length > 0;
  const configured = configuredAdminLogins.map((value) => value.toLowerCase());
  const configuredBootstrap = configured.includes(login.toLowerCase());
  const bootstrap = allUsers.length === 0 || (!hasAdmin && configuredBootstrap);
  return {
    status: bootstrap ? "approved" : "pending",
    isAdmin: bootstrap,
    bootstrapped: bootstrap,
  };
}

let registryLock = Promise.resolve();

export async function withAccessRegistryLock(operation) {
  const previous = registryLock;
  let release;
  registryLock = new Promise((resolve) => { release = resolve; });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

export function removalGuard(users, login) {
  const target = (users || []).find((user) => user.login.toLowerCase() === login.toLowerCase());
  if (!target) return { allowed: false, reason: "User not found." };
  const admins = approvedAdmins(users);
  if (isApprovedAdmin(target) && admins.length <= 1) {
    return { allowed: false, reason: "The sole administrator cannot be removed or demoted." };
  }
  return { allowed: true, target, adminCount: admins.length };
}
