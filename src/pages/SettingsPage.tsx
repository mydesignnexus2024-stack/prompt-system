import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useProfile, useUpsertProfile, getAvatarUrl } from '../hooks/useProfile';
import { useTodoEmailPreference } from '../hooks/useTodos';

// Upload a file to Supabase Storage with XHR progress tracking
async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  token: string,
  supabaseUrl: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) { resolve(); }
      else { reject(new Error(`Upload failed: ${xhr.statusText}`)); }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.send(file);
  });
}
import { Bug, Film, ImageIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { BugReportModal } from '../components/ui/BugReportModal';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

const pwSchema = z.object({
  currentPassword: z.string({ error: 'Current password is required' }).min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PwForm = z.infer<typeof pwSchema>;

// ── Notifications section ───────────────────────────────────────────────────
function NotificationsSection() {
  const { enabled, setEnabled, isUpdating } = useTodoEmailPreference();

  const handleToggle = async () => {
    const next = !enabled;
    try {
      await setEnabled(next);
      toast.success(next ? 'Todo email notifications enabled' : 'Todo email notifications disabled');
    } catch {
      toast.error('Failed to update notification preference');
    }
  };

  return (
    <section className="bg-white border border-ink-300 rounded-lg p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-ink-300">
        <Icon name="notifications" size={18} className="text-brand-400 flex-shrink-0" fill />
        <h2 className="font-display font-semibold text-ink-900">Notifications</h2>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-900">Todo email notifications</p>
          <p className="text-xs text-ink-500 mt-0.5">
            Receive emails when you create a todo, when it's due soon, when you complete it, or when it goes overdue.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          disabled={isUpdating}
          className={cn(
            'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
            enabled ? 'bg-brand-500' : 'bg-ink-300',
          )}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm',
              enabled ? 'left-[22px]' : 'left-0.5',
            )}
          />
        </button>
      </div>
    </section>
  );
}

// ── Community Submissions Review ────────────────────────────────────────────

interface Submission {
  id: string;
  submitter_name: string;
  submitter_email: string | null;
  prompt_type: 'video' | 'image';
  platform: string;
  title: string;
  prompt_text: string;
  notes: string | null;
  tags: string[];
  media_path: string | null;
  media_type: 'image' | 'video' | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_notes: string | null;
  created_at: string;
}

function SubmissionsSection() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['community-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Submission[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('community_submissions')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-submissions'] }),
  });

  const pending = submissions.filter((s) => s.status === 'pending');
  const reviewed = submissions.filter((s) => s.status !== 'pending');

  const handleApprove = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'approved' });
      toast.success('Submission approved');
    } catch { toast.error('Failed to update'); }
  };

  const handleReject = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'rejected' });
      toast.success('Submission rejected');
    } catch { toast.error('Failed to update'); }
  };

  const statusIcon = (s: Submission['status']) => {
    if (s === 'approved') return <CheckCircle2 size={14} className="text-green-500" />;
    if (s === 'rejected') return <XCircle size={14} className="text-danger" />;
    return <Clock size={14} className="text-amber-500" />;
  };

  const SubmissionRow = ({ sub }: { sub: Submission }) => {
    const isOpen = expanded === sub.id;
    const mediaUrl = sub.media_path
      ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/submission-media/${sub.media_path}`
      : null;

    return (
      <div className="border border-ink-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded(isOpen ? null : sub.id)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ink-50 transition-colors text-left"
        >
          {sub.prompt_type === 'video' ? <Film size={15} className="text-blue-500 flex-shrink-0" /> : <ImageIcon size={15} className="text-pink-500 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{sub.title}</p>
            <p className="text-xs text-ink-500">{sub.submitter_name} · {sub.platform} · {new Date(sub.created_at).toLocaleDateString()}</p>
          </div>
          <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0',
            sub.status === 'approved' ? 'bg-green-50 text-green-700' :
            sub.status === 'rejected' ? 'bg-red-50 text-danger' : 'bg-amber-50 text-amber-700'
          )}>
            {statusIcon(sub.status)} {sub.status}
          </span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-ink-200 px-4 py-4 space-y-3 bg-ink-50/50">
                {sub.submitter_email && (
                  <p className="text-xs text-ink-500">Email: <span className="text-ink-700">{sub.submitter_email}</span></p>
                )}
                <div>
                  <p className="text-xs font-medium text-ink-500 mb-1">Prompt text</p>
                  <pre className="text-sm text-ink-800 whitespace-pre-wrap font-sans bg-white rounded-md border border-ink-200 p-3 max-h-40 overflow-y-auto">{sub.prompt_text}</pre>
                </div>
                {sub.notes && (
                  <div>
                    <p className="text-xs font-medium text-ink-500 mb-1">Notes</p>
                    <p className="text-sm text-ink-700">{sub.notes}</p>
                  </div>
                )}
                {sub.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sub.tags.map((t) => <span key={t} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">#{t}</span>)}
                  </div>
                )}
                {mediaUrl && sub.media_type === 'image' && (
                  <img src={mediaUrl} alt="Submission" className="max-h-48 rounded-lg border border-ink-200 object-contain" />
                )}
                {mediaUrl && sub.media_type === 'video' && (
                  <video src={mediaUrl} controls className="w-full max-h-48 rounded-lg border border-ink-200" />
                )}
                {sub.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(sub.id)}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-60"
                    >
                      <CheckCircle2 size={13} /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(sub.id)}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-danger border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-60"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <section className="bg-white border border-ink-300 rounded-lg p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-ink-300">
        <Icon name="inbox" size={18} className="text-brand-400 flex-shrink-0" />
        <h2 className="font-display font-semibold text-ink-900">Community Submissions</h2>
        {pending.length > 0 && (
          <span className="ml-auto text-xs font-bold text-white bg-amber-500 rounded-full px-2 py-0.5">{pending.length} pending</span>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-500 text-center py-4">Loading…</p>
      ) : submissions.length === 0 ? (
        <p className="text-sm text-ink-500 text-center py-4">No submissions yet.</p>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Pending review</p>
              {pending.map((s) => <SubmissionRow key={s.id} sub={s} />)}
            </div>
          )}
          {reviewed.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Reviewed</p>
              {reviewed.map((s) => <SubmissionRow key={s.id} sub={s} />)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const upsertProfile = useUpsertProfile();
  const [showPw, setShowPw] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync display name from loaded profile
  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setUploadProgress(null);
    try {
      let avatarPath = profile?.avatar_path ?? null;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg';
        const path = `${user.id}/avatar.${ext}`;
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? '';
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        setUploadProgress(0);
        await uploadWithProgress('avatars', path, avatarFile, token, supabaseUrl, setUploadProgress);
        avatarPath = path;
      }
      await upsertProfile.mutateAsync({ display_name: displayName.trim(), avatar_path: avatarPath });
      setAvatarFile(null);
      setAvatarPreview(null);
      setUploadProgress(null);
      toast.success('Profile saved!');
    } catch {
      setUploadProgress(null);
      toast.error('Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const pwForm = useForm<PwForm>({ resolver: zodResolver(pwSchema) });

  const handlePasswordChange = async (data: PwForm) => {
    if (!user?.email) { toast.error('Not signed in'); return; }
    // Verify current password by re-authenticating
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: data.currentPassword,
    });
    if (verifyError) {
      toast.error('Current password is incorrect');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: data.newPassword });
    if (error) { toast.error(error.message); return; }
    toast.success('Password updated!');
    pwForm.reset();
  };

  return (
    <>
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <motion.h1
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-display font-extrabold text-ink-900 tracking-tight"
        >
          Settings
        </motion.h1>

        {/* ── Profile ─────────────────────────────────────────────── */}
        <section className="bg-white border border-ink-300 rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-ink-300">
            <Icon name="person" size={18} className="text-brand-400 flex-shrink-0" fill />
            <h2 className="font-display font-semibold text-ink-900">Profile</h2>
          </div>

          <div className="flex items-start gap-4">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => !savingProfile && avatarInputRef.current?.click()}
                disabled={savingProfile}
                className="group relative w-20 h-20 rounded-full overflow-hidden border-2 border-ink-300 hover:border-brand-400 transition-colors disabled:cursor-not-allowed"
              >
                {/* Image / initials */}
                {avatarPreview || profile?.avatar_path ? (
                  <img
                    src={avatarPreview ?? (profile?.avatar_path ? getAvatarUrl(profile.avatar_path) : '')}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold">
                    {(displayName || user?.email)?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}

                {/* Upload progress overlay */}
                <AnimatePresence>
                  {uploadProgress !== null ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-0.5"
                    >
                      {/* SVG ring */}
                      <svg width="44" height="44" className="-rotate-90">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                        <motion.circle
                          cx="22" cy="22" r="18"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 18}
                          animate={{ strokeDashoffset: 2 * Math.PI * 18 * (1 - uploadProgress / 100) }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                      </svg>
                      <span className="text-white text-[11px] font-bold -mt-8">{uploadProgress}%</span>
                    </motion.div>
                  ) : !savingProfile ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center"
                    >
                      <Icon name="photo_camera" size={20} className="text-white" />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Hover camera icon (non-uploading state) */}
                {uploadProgress === null && !savingProfile && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon name="photo_camera" size={20} className="text-white" />
                  </div>
                )}
              </button>

              {/* Status text below avatar */}
              {uploadProgress !== null ? (
                <p className="text-[11px] text-brand-400 font-medium text-center leading-tight">
                  Uploading…<br />{uploadProgress}%
                </p>
              ) : (
                <p className="text-[11px] text-ink-500 text-center leading-tight">Click to<br/>upload photo</p>
              )}

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = ''; }}
              />
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <label className="text-xs font-medium text-ink-700 block mb-1">Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name (shown on courses)"
                  className="w-full h-10 px-3 rounded-md bg-ink-100 border border-ink-300 text-ink-900 placeholder-ink-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-ink-700 mb-1">Email</p>
                <p className="text-sm text-ink-500 truncate">{user?.email}</p>
              </div>
              <p className="text-xs text-ink-400">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {/* Progress bar — only visible when uploading a photo */}
            <AnimatePresence>
              {uploadProgress !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs text-ink-700 font-medium">Uploading photo…</p>
                    <span className="text-xs text-brand-400 font-bold ml-auto">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden border border-ink-200">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleSaveProfile}
              loading={savingProfile}
              disabled={!displayName.trim()}
              className="w-full sm:w-auto"
            >
              <Icon name="save" size={15} />
              {uploadProgress !== null ? `Uploading… ${uploadProgress}%` : 'Save Profile'}
            </Button>
          </div>
        </section>

        {/* ── Change Password ──────────────────────────────────────── */}
        <section className="bg-white border border-ink-300 rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-ink-300">
            <Icon name="key" size={18} className="text-brand-400 flex-shrink-0" />
            <h2 className="font-display font-semibold text-ink-900">Change Password</h2>
          </div>
          <form onSubmit={pwForm.handleSubmit(handlePasswordChange)} className="space-y-4">
            <div className="relative">
              <Input
                label="Current Password"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your current password"
                error={pwForm.formState.errors.currentPassword?.message}
                className="pr-11"
                {...pwForm.register('currentPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 bottom-0 h-11 flex items-center text-ink-500 hover:text-ink-900 transition-colors"
              >
                <Icon name={showPw ? 'visibility_off' : 'visibility'} size={18} />
              </button>
            </div>
            <Input
              label="New Password"
              type={showPw ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              error={pwForm.formState.errors.newPassword?.message}
              {...pwForm.register('newPassword')}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat your new password"
              error={pwForm.formState.errors.confirmPassword?.message}
              {...pwForm.register('confirmPassword')}
            />
            <Button type="submit" loading={pwForm.formState.isSubmitting} className="w-full sm:w-auto">
              Update Password
            </Button>
          </form>
        </section>

        {/* ── Notifications ───────────────────────────────────────── */}
        <NotificationsSection />

        {/* ── Sign out ─────────────────────────────────────────────── */}
        <section className="bg-white border border-red-200 rounded-lg p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink-900">Sign out</p>
              <p className="text-xs text-ink-500 mt-0.5">You will be signed out of all devices.</p>
            </div>
            <button
              onClick={async () => { await signOut(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-danger text-sm font-semibold hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <Icon name="logout" size={16} className="text-danger" />
              Sign out
            </button>
          </div>
        </section>

        {/* ── Community Submissions ───────────────────────────────────── */}
        <SubmissionsSection />

        {/* ── Report a bug ────────────────────────────────────────────── */}
        <section className="bg-white border border-ink-200 rounded-lg p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink-900">Report an Issue</p>
              <p className="text-xs text-ink-500 mt-0.5">Found a bug or something broken? Let us know.</p>
            </div>
            <button
              onClick={() => setBugReportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-ink-200 text-ink-700 text-sm font-semibold hover:bg-ink-50 transition-colors flex-shrink-0"
            >
              <Bug size={16} />
              Report Bug
            </button>
          </div>
        </section>
      </div>

      {/* ── Bug report modal ─────────────────────────────────────────── */}
      <BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </>
  );
}
