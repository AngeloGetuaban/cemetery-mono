function routeForRole(role) {
    switch (role) {
      case 'super_admin': return '/superadmin/setup';
      case 'admin':       return '/admin/plots';
      case 'staff':       return '/staff/dashboard/';
      default:            return '/visitor/home';
    }
  }
  
  export async function postLogin({ usernameOrEmail, password }) {
    const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
    console.log(BASE);
    const url = `${BASE}/auth/login`;
  
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });
  
    let data = null;
    try { data = await res.json(); } catch { /* ignore */ }
  
    if (!res.ok) {
      const message = data?.error || `Login failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }
  
    const token = data?.token;
    const user  = data?.user;
  
    if (token && user) {
      localStorage.setItem('auth', JSON.stringify({ token, user }));
    }
  
    return { token, user, next: routeForRole(user?.role) };
  }
  