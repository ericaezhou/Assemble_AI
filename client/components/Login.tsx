'use client';

import { useState } from 'react';
import { signIn } from '@/utils/auth';

interface LoginProps {
  onLoginSuccess: (userId: string) => void;
  onSignupClick: () => void;
}

export default function Login({ onLoginSuccess, onSignupClick }: LoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign in with Supabase Auth (client-side)
      const { user } = await signIn(formData.email, formData.password);
      // Session and token are automatically stored by Supabase
      onLoginSuccess(user.id);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-1.5 mb-10">
          <span className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            ASSEMBLE
          </span>
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>Welcome back</h1>
          <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>Sign in to continue to Assemble AI</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block mb-1.5 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-1.5 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm font-medium"
                style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center"
              style={{ padding: '10px 16px', fontSize: '0.9rem', marginTop: '8px' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Don&apos;t have an account?{' '}
              <button
                onClick={onSignupClick}
                className="font-semibold transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
