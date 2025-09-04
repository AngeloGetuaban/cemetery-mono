// src/utils/auth.js
export function getAuth() {
  try {
    const raw = localStorage.getItem('auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthed() {
  return !!getAuth()?.token;
}

export function hasRole(...roles) {
  const a = getAuth();
  return !!a && roles.includes(a.user?.role);
}
