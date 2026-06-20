'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

interface SimpleEcoLoginProps {
  onLoginSuccess: () => void;
}

export default function SimpleEcoLogin({ onLoginSuccess }: SimpleEcoLoginProps) {
  const { login: authLogin }     = useAuth();
  const { showNotification }     = useNotification();
  const [emailInput, setEmail]   = useState('');
  const [passwordInput, setPass] = useState('');
  const [showPw, setShowPw]      = useState(false);
  const [authError, setError]    = useState('');
  const [submitting, setSubmit]  = useState(false);
  const [animateOut, setAnim]    = useState(false);
  const canvasRef                = useRef<HTMLCanvasElement>(null);

  /* ── Particle canvas ─────────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    type P = { x: number; y: number; vx: number; vy: number; r: number; c: string };
    const pts: P[] = [];

    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < 65; i++) {
      const roll = Math.random();
      pts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r:  Math.random() * 1.8 + 0.6,
        c:  roll > 0.66
              ? 'rgba(52,211,153,0.65)'
              : roll > 0.33
              ? 'rgba(255,255,255,0.80)'
              : 'rgba(167,139,250,0.50)',
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.shadowBlur = 7; ctx.shadowColor = p.c;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf); };
  }, []);

  /* ── Form submit ─────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const email = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      showNotification('Please enter a valid email address.', 'warning');
      return;
    }
    setSubmit(true);
    localStorage.setItem('activeEcoUser', email);
    const ok = await authLogin(email);
    if (ok) { setAnim(true); setTimeout(onLoginSuccess, 500); }
    else     { setSubmit(false); }
  };

  return (
    <>
      {/*
        ══════════════════════════════════════════════════════════════════════
        SCOPED STYLE BLOCK
        – Targets #eco-login-root and every descendant with !important
        – Completely overrides globals.css body { color: #0f172a }
        – Kills any inherited backdrop-filter, filter, text-shadow
        ══════════════════════════════════════════════════════════════════════
      */}
      <style>{`
        /* ── Reset inherited dark color from globals.css body ── */
        #eco-login-root,
        #eco-login-root * {
          box-sizing: border-box !important;
          text-shadow: none !important;
          filter: none !important;
        }

        /* ── Headings ── */
        #eco-login-root h1 {
          color: #ffffff !important;
          opacity: 1 !important;
        }

        /* ── Subtitle / paragraph text ── */
        #eco-login-root .eco-subtitle {
          color: #6ee7b7 !important;
          opacity: 1 !important;
        }

        /* ── Form labels ── */
        #eco-login-root label {
          color: #a7f3d0 !important;
          opacity: 1 !important;
        }

        /* ── Input fields ── */
        #eco-login-root input {
          background-color: #0f172a !important;
          color: #ffffff !important;
          border: 1px solid #10b981 !important;
          opacity: 1 !important;
          filter: none !important;
          -webkit-text-fill-color: #ffffff !important;
        }

        /* ── Placeholder text ── */
        #eco-login-root input::placeholder {
          color: #cbd5e1 !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #cbd5e1 !important;
        }

        /* ── Autofill chrome override ── */
        #eco-login-root input:-webkit-autofill,
        #eco-login-root input:-webkit-autofill:hover,
        #eco-login-root input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0f172a inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #10b981 !important;
        }

        /* ── Focus ring ── */
        #eco-login-root input:focus {
          outline: none !important;
          border-color: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.22) !important;
        }

        /* ── Footer note ── */
        #eco-login-root .eco-footer-note {
          color: #64748b !important;
          opacity: 1 !important;
        }

        /* ── Error text ── */
        #eco-login-root .eco-error {
          color: #fca5a5 !important;
          opacity: 1 !important;
        }

        /* ── Eye toggle button ── */
        #eco-login-root .eco-eye-btn {
          color: rgba(148,163,184,0.85) !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
        }
        #eco-login-root .eco-eye-btn:hover {
          color: #6ee7b7 !important;
        }

        /* ── CTA button ── */
        #eco-signin-btn {
          color: #ffffff !important;
          font-weight: 900 !important;
          letter-spacing: 0.18em !important;
          text-transform: uppercase !important;
          opacity: 1 !important;
          cursor: pointer !important;
        }
        #eco-signin-btn:disabled {
          cursor: not-allowed !important;
          opacity: 0.7 !important;
        }
      `}</style>

      {/* ── Full-screen container ─────────────────────────────────────────── */}
      <div
        id="eco-login-root"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          50,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '16px',
          overflow:        'hidden',
          background:      'linear-gradient(135deg, #020617 0%, #0c1a2e 55%, #041a10 100%)',
          transition:      'opacity 0.5s ease, transform 0.5s ease',
          opacity:         animateOut ? 0 : 1,
          transform:       animateOut ? 'scale(0.94)' : 'scale(1)',
          pointerEvents:   animateOut ? 'none' : 'auto',
        }}
      >
        {/* Canvas – z:0 strictly behind card */}
        <canvas
          ref={canvasRef}
          style={{
            position:      'absolute',
            inset:         0,
            width:         '100%',
            height:        '100%',
            zIndex:        0,
            pointerEvents: 'none',
            display:       'block',
          }}
        />

        {/* Neon grid – z:1 */}
        <div style={{
          position:        'absolute',
          inset:           0,
          zIndex:          1,
          pointerEvents:   'none',
          backgroundImage: 'linear-gradient(rgba(52,211,153,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.055) 1px, transparent 1px)',
          backgroundSize:  '3.5rem 3.5rem',
        }} />

        {/* ── Card – z:10, glassmorphism background ─────────────────────── */}
        <div style={{
          position:     'relative',
          zIndex:       10,
          width:        '105%',
          maxWidth:     '440px',
          borderRadius: '24px',
          overflow:     'hidden',
          background:   'rgba(8, 15, 30, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border:       '1.5px solid rgba(16,185,129,0.20)',
          boxShadow:    '0 0 30px rgba(16, 185, 129, 0.05), 0 32px 80px rgba(0,0,0,0.60)',
        }}>

          {/* TIER 1 — Header */}
          <div style={{
            padding:      '32px 32px 28px',
            textAlign:    'center',
            backgroundColor: 'rgba(10, 25, 41, 0.50)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.18)',
          }}>
            {/* Icon badge */}
            <div style={{
              width:           '48px',
              height:          '48px',
              borderRadius:    '14px',
              backgroundColor: 'rgba(16,185,129,0.14)',
              border:          '1px solid rgba(16,185,129,0.35)',
              color:           '#34d399',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              margin:          '0 auto 18px',
              boxShadow:       '0 4px 20px rgba(16,185,129,0.18)',
            }}>
              <Leaf size={24} />
            </div>

            {/* Title — forced white via scoped CSS + inline */}
            <h1 style={{
              margin:          0,
              fontSize:        '28px',
              fontWeight:      900,
              letterSpacing:   '0.10em',
              color:           '#ffffff',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             '8px',
              lineHeight:      1.15,
            }}>
              ECOTRACK AI
              <span style={{ color: '#34d399', fontSize: '26px', filter: 'none' }}>⚡</span>
            </h1>

            {/* Subtitle */}
            <p className="eco-subtitle" style={{
              margin:          '10px 0 0',
              fontSize:        '11px',
              fontWeight:      700,
              letterSpacing:   '0.16em',
              textTransform:   'uppercase',
              color:           '#6ee7b7',
            }}>
              Marketplace Core Access Gateway
            </p>
          </div>

          {/* TIER 2 — Form body */}
          <div style={{
            padding:         '32px',
            backgroundColor: 'rgba(15, 31, 46, 0.40)',
          }}>
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              autoComplete="on"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="eco-email"
                  style={{
                    display:       'block',
                    fontSize:      '11px',
                    fontWeight:    700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color:         '#a7f3d0',
                    marginBottom:  '8px',
                  }}
                >
                  Email Address
                </label>
                <input
                  id="eco-email"
                  name="email"
                  type="text"
                  value={emailInput}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  required
                  autoComplete="email"
                  style={{
                    display:         'block',
                    width:           '100%',
                    padding:         '13px 16px',
                    borderRadius:    '10px',
                    border:          '1px solid #10b981',
                    backgroundColor: '#0f172a',
                    color:           '#ffffff',
                    fontSize:        '14px',
                    fontWeight:      600,
                    lineHeight:      '1.4',
                    caretColor:      '#10b981',
                  }}
                />
                {authError && (
                  <p className="eco-error" style={{
                    margin:     '8px 0 0',
                    fontSize:   '12px',
                    fontWeight: 700,
                    color:      '#fca5a5',
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '4px',
                  }}>
                    ⚠️ {authError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="eco-password"
                  style={{
                    display:       'block',
                    fontSize:      '11px',
                    fontWeight:    700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color:         '#a7f3d0',
                    marginBottom:  '8px',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="eco-password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={e => setPass(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      display:         'block',
                      width:           '100%',
                      padding:         '13px 44px 13px 16px',
                      borderRadius:    '10px',
                      border:          '1px solid #10b981',
                      backgroundColor: '#0f172a',
                      color:           '#ffffff',
                      fontSize:        '14px',
                      fontWeight:      600,
                      lineHeight:      '1.4',
                      caretColor:      '#10b981',
                    }}
                  />
                  <button
                    type="button"
                    className="eco-eye-btn"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position:       'absolute',
                      right:          '12px',
                      top:            '50%',
                      transform:      'translateY(-50%)',
                      background:     'transparent',
                      border:         'none',
                      cursor:         'pointer',
                      padding:        '4px',
                      color:          'rgba(148,163,184,0.85)',
                      display:        'flex',
                      alignItems:     'center',
                    }}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* CTA Button */}
              <button
                id="eco-signin-btn"
                type="submit"
                disabled={submitting}
                style={{
                  display:         'block',
                  width:           '100%',
                  padding:         '15px 0',
                  borderRadius:    '12px',
                  background:      submitting
                    ? '#065f46'
                    : 'linear-gradient(90deg, #10b981 0%, #0d9488 100%)',
                  color:           '#ffffff',
                  fontSize:        '13px',
                  fontWeight:      900,
                  letterSpacing:   '0.20em',
                  textTransform:   'uppercase',
                  border:          'none',
                  boxShadow:       submitting ? 'none' : '0 4px 24px rgba(16,185,129,0.40)',
                  transition:      'background 0.22s, box-shadow 0.22s, transform 0.15s',
                  cursor:          submitting ? 'not-allowed' : 'pointer',
                  outline:         'none',
                }}
                onMouseEnter={e => {
                  if (!submitting) {
                    const el = e.currentTarget;
                    el.style.background  = 'linear-gradient(90deg, #059669 0%, #0f766e 100%)';
                    el.style.boxShadow   = '0 6px 36px rgba(16,185,129,0.55)';
                    el.style.transform   = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={e => {
                  if (!submitting) {
                    const el = e.currentTarget;
                    el.style.background  = 'linear-gradient(90deg, #10b981 0%, #0d9488 100%)';
                    el.style.boxShadow   = '0 4px 24px rgba(16,185,129,0.40)';
                    el.style.transform   = 'translateY(0)';
                  }
                }}
                onMouseDown={e  => { if (!submitting) (e.currentTarget).style.transform = 'scale(0.97)'; }}
                onMouseUp={e    => { if (!submitting) (e.currentTarget).style.transform = 'translateY(-2px)'; }}
              >
                {submitting ? 'Authenticating…' : 'Sign In Securely'}
              </button>
            </form>

            {/* Footer */}
            <div
              className="eco-footer-note"
              style={{
                marginTop:   '24px',
                paddingTop:  '16px',
                borderTop:   '1px solid rgba(16,185,129,0.12)',
                textAlign:   'center',
                fontSize:    '10px',
                color:       '#64748b',
                lineHeight:  1.6,
              }}
            >
              Secured via JWT Tenant Isolation &amp; SQL Database integrity checking layer.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
