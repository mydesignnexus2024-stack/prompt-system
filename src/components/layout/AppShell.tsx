import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../ui/Icon';
import { FollowPopup } from '../ui/FollowPopup';
import { cn } from '../../lib/utils';

// ── AppShell ──────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  // Close user menu on route change
  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate('/explore');
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <FollowPopup />

      {/* Top header — logo left, user icon right */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white/80 backdrop-blur-md border-b border-ink-200">
        <div className="h-full flex items-center justify-between px-4 sm:px-6">
          {/* Logo — top left */}
          <Link to="/explore" className="flex items-center gap-2.5">
            <img src="/aiwithrakshith-tech-logo.webp" alt="aiwithrakshith.tech" className="h-8 w-8 object-contain flex-shrink-0" />
            <span className="font-display font-black text-ink-900 tracking-tight leading-none" style={{ fontSize: '13px', letterSpacing: '-0.02em' }}>
              aiwithrakshith
            </span>
          </Link>

          {/* User icon — top right */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95"
              aria-label="Account menu"
            >
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-60 bg-white border border-ink-200 rounded-xl shadow-card-hover overflow-hidden z-[80]"
                >
                  <div className="px-4 py-3 border-b border-ink-100">
                    <p className="text-xs text-ink-400 leading-none mb-1">Signed in as</p>
                    <p className="text-sm font-medium text-ink-900 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-danger hover:bg-red-50 transition-colors font-medium"
                  >
                    <Icon name="logout" size={16} className="text-danger" />
                    Sign out
                  </button>
                  <div className="px-4 py-2.5 border-t border-ink-100">
                    <p className="text-[10px] text-ink-400 text-center leading-relaxed">
                      Developed by{' '}
                      <a
                        href="https://www.instagram.com/aiwithrakshith?igsh=anAxYmJrdWhsODFj"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-500 hover:text-brand-600 font-semibold transition-colors"
                      >
                        @aiwithrakshith
                      </a>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="overflow-x-hidden w-full min-w-0 pt-14">
        {children}
      </main>
    </div>
  );
}
