import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { Lock, Mail, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-backdrop-glow" />
      
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-wrap">
            <img
              src="/images/Logo_Lockup-01.png"
              alt="KBZ Bank & KBZPay Logo"
              className="login-logo-img"
            />
          </div>
          <h2>Creative Hub</h2>
          <p>Subscription Manager & AI Token Tracking</p>
        </div>

        {error && (
          <div className="login-error-box">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Work Email</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                Sign In to Dashboard <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
