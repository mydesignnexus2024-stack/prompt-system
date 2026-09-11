import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from './AppShell';

export function ProtectedRoute() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-ink-500 text-sm">Loading aiwithrakshith.tech...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
