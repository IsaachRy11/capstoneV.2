// Students sign in with their student ID (2025-0001) and the secretary with a secretary ID (CCS-001).
// Behind the scenes each ID is a login address on a made-up domain (no real mailbox).
// Student logins are created by the app (Edge Function) or scripts/create-student-accounts.mjs,
// secretary logins by scripts/set-secretary-id.mjs. Anything else typed is treated as an email.

export const STUDENT_LOGIN_DOMAIN = "students.ccs-monitor.test";

export const SECRETARY_LOGIN_DOMAIN = "staff.ccs-monitor.test";

export const isSecretaryId = (s = "") => /^[A-Za-z]{2,}-\d{3,}$/.test(s.trim());

export const isStudentId = (s = "") => /^\d{4}-\d{4}$/.test(s.trim());

export const loginEmail = (identifier = "") =>
  isStudentId(identifier) ? `${identifier.trim()}@${STUDENT_LOGIN_DOMAIN}`
  : isSecretaryId(identifier) ? `${identifier.trim().toLowerCase()}@${SECRETARY_LOGIN_DOMAIN}`
  : identifier.trim().toLowerCase();
