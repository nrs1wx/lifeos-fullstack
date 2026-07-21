import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react';
import { api, setToken } from '../api';

interface AuthProps {
  onLogin: (isNewUser: boolean) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailAvailability, setEmailAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const passwordValid = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);

  useEffect(() => {
    if (tab !== 'register') return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setEmailAvailability(normalized ? 'invalid' : 'idle'); return; }
    setEmailAvailability('checking');
    const timer = window.setTimeout(() => {
      api.checkEmail(normalized).then(({ available }) => setEmailAvailability(available ? 'available' : 'taken')).catch(() => setEmailAvailability('invalid'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [email, tab]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        const { token } = await api.login(email, password);
        setToken(token);
        onLogin(false);
      } else {
        if (!passwordValid) {
          setError('Password must be at least 8 characters and include one letter and one number.');
          setLoading(false);
          return;
        }
        if (name.trim().length < 2 || name.trim().length > 60) {
          setError('Name must be between 2 and 60 characters.');
          setLoading(false);
          return;
        }
        if (emailAvailability !== 'available') { setError('Use a valid available email address.'); setLoading(false); return; }
        const { token } = await api.register(name, email, password);
        setToken(token);
        onLogin(true); // new user goes to onboarding
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-[420px] bg-surface rounded-2xl border border-outline-variant shadow-sm flex flex-col p-5 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-heading font-bold text-on-surface mb-2">LifeOS</h1>
          <p className="text-[14px] text-on-surface-variant">Your personal operating system.</p>
        </div>

        <div className="flex bg-surface-container-low rounded-lg p-1 mb-8">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-colors ${tab === 'login' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Log In
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-colors ${tab === 'register' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface border border-outline-variant text-on-surface text-[14px] rounded-lg py-3 pl-10 pr-4 outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-outline-variant text-on-surface text-[14px] rounded-lg py-3 pl-10 pr-4 outline-none focus:border-primary transition-colors"
            />
          </div>
          {tab === 'register' && <p className={`text-[12px] -mt-2 ${emailAvailability === 'available' ? 'text-secondary' : emailAvailability === 'taken' || emailAvailability === 'invalid' ? 'text-error' : 'text-on-surface-variant'}`}>
            {emailAvailability === 'checking' && 'Checking email...'}
            {emailAvailability === 'available' && 'Email is available'}
            {emailAvailability === 'taken' && 'This email is already in use. Log in or choose another one.'}
            {emailAvailability === 'invalid' && 'Enter a valid email.'}
          </p>}

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-outline-variant text-on-surface text-[14px] rounded-lg py-3 pl-10 pr-10 outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {tab === 'register' && password && <p className={`text-[12px] -mt-2 ${passwordValid ? 'text-secondary' : 'text-error'}`}>{passwordValid ? 'Password looks good' : 'Use at least 8 characters, one letter, and one number.'}</p>}

          {error && <p className="text-[13px] text-error mt-2">{error}</p>}

          <button
            type="submit"
            disabled={loading || (tab === 'register' && (!passwordValid || emailAvailability !== 'available' || name.trim().length < 2))}
            className="w-full bg-primary text-on-primary font-medium text-[14px] py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center h-[46px] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : tab === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
