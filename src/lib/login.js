// Students sign in with their student ID. Behind the scenes their login is the address below
// (created by scripts/create-student-accounts.mjs). Staff sign in with their real email.

export const STUDENT_LOGIN_DOMAIN = "students.ccs-monitor.test";

export const isStudentId = (s = "") => /^\d{4}-\d{4}$/.test(s.trim());

export const loginEmail = (identifier = "") =>
  isStudentId(identifier) ? `${identifier.trim()}@${STUDENT_LOGIN_DOMAIN}` : identifier.trim().toLowerCase();
