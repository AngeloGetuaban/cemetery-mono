// POST /auth/register
// Body: { username, email, password, first_name, last_name, phone?, address? }
// If backend returns { token, user }, we save and route by role.
// If it only returns { user }, we return next:'/visitor/home' (or switch to login in the UI).
function routeForRole(role) {
    switch (role) {
      case 'super_admin': return '/superadmin/dashboard';
      case 'admin':       return '/admin/dashboard';
      case 'staff':       return '/staff/dashboard/';
      default:            return '/visitor/home';
    }
  }
  
  export async function postSignup({ username, email, password, first_name, last_name, phone, address }) {
    const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
    const url = `${BASE}/auth/register`;
  
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        first_name,
        last_name,
        phone: phone || null,
        address: address || null,
      }),
    });
  
    let data = null;
    try { data = await res.json(); } catch { /* ignore */ }
  
    if (!res.ok) {
      const message = data?.error || `Sign up failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }
  
    // Support both styles of register response:
    //  - { user }   (no token)
    //  - { token, user }
    const token = data?.token || null;
    const user  = data?.user  || data || null;
  
    if (token && user) {
      localStorage.setItem('auth', JSON.stringify({ token, user }));
    }
  
    const next = token && user ? routeForRole(user.role) : '/visitor/home';
    return { token, user, next };
  }
  