import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postLogin } from './js/login';
import { postSignup } from './js/signup';

export default function Login() {
  const nav = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
    username: '',
    email: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  const onChange = (e) => {
    setMsg({ type: '', text: '' });
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const toggleForm = () => {
    setIsLogin((v) => !v);
    setMsg({ type: '', text: '' });
    setFormData({
      usernameOrEmail: '',
      password: '',
      username: '',
      email: '',
      confirmPassword: '',
      first_name: '',
      last_name: '',
      phone: '',
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    try {
      setLoading(true);

      if (isLogin) {
        if (!formData.usernameOrEmail || !formData.password) {
          setMsg({ type: 'error', text: 'Please enter email/username and password.' });
          return;
        }
        const { next } = await postLogin({
          usernameOrEmail: formData.usernameOrEmail.trim(),
          password: formData.password,
        });
        nav(next);
      } else {
        if (!formData.username || !formData.email || !formData.password || !formData.first_name || !formData.last_name) {
          setMsg({ type: 'error', text: 'Please complete all required fields.' });
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setMsg({ type: 'error', text: 'Passwords do not match.' });
          return;
        }
        const { token, next } = await postSignup({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          address: null,
        });

        if (token) {
          // auto-logged in → go to role-based page
          nav(next);
        } else {
          // created but not logged in → switch to sign in
          setMsg({ type: 'ok', text: 'Account created! Please sign in.' });
          setIsLogin(true);
          setFormData({
            usernameOrEmail: formData.email,
            password: '',
            username: '',
            email: '',
            confirmPassword: '',
            first_name: '',
            last_name: '',
            phone: '',
          });
        }
      }
    } catch (err) {
      setMsg({ type: 'error', text: err?.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center font-poppins">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full mx-4 mt-10 mb-10">
        <div className="px-8 py-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-slate-600 text-sm">
              {isLogin ? 'Enter your credentials to access your account' : 'Fill in your details to get started'}
            </p>
          </div>

          {msg.text ? (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                msg.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {msg.text}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={onChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="johndoe"
                    autoComplete="username"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={onChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      placeholder="John"
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={onChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      placeholder="Doe"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isLogin ? 'Email or Username' : 'Email Address'}
              </label>
              <input
                type={isLogin ? 'text' : 'email'}
                name={isLogin ? 'usernameOrEmail' : 'email'}
                value={isLogin ? formData.usernameOrEmail : formData.email}
                onChange={onChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder={isLogin ? 'you@example.com or johndoe' : 'you@example.com'}
                autoComplete="email"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={onChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="+63 912 345 6789"
                  autoComplete="tel"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={onChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={onChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                  onClick={() => setMsg({ type: 'ok', text: 'Please contact the administrator to reset your password.' })}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-emerald-600 text-white py-3 px-4 rounded-xl font-semibold focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transform transition-all duration-200 shadow-lg
                ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-emerald-700 hover:scale-105'}`}
            >
              {loading ? (isLogin ? 'Signing in…' : 'Creating…') : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button onClick={toggleForm} className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                {isLogin ? 'Sign up here!' : 'Sign in here!'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
