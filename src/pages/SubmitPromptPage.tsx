import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Film, ImageIcon, CheckCircle2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { cn } from '../lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const VIDEO_PLATFORMS = ['Veo 3', 'Seedance 2.0', 'Kling', 'Runway', 'Pika', 'HeyGen', 'Other'] as const;
const IMAGE_PLATFORMS = ['GPT Image', 'Midjourney', 'DALL·E 3', 'Adobe Firefly', 'Ideogram', 'Leonardo', 'Other'] as const;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  submitter_name: z.string().min(1, 'Your name is required').max(100),
  submitter_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  platform: z.string().min(1, 'Select a platform'),
  title: z.string().min(1, 'Title is required').max(200),
  prompt_text: z.string().min(1, 'Prompt text is required'),
  notes: z.string().optional(),
  tags_raw: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Tag input (inline, lightweight) ─────────────────────────────────────────

function TagsInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    const tag = input.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !value.includes(tag) && value.length < 10) {
      onChange([...value, tag]);
    }
    setInput('');
  };

  const remove = (t: string) => onChange(value.filter((x) => x !== t));

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-700 block">Tags <span className="text-ink-400 font-normal">(optional)</span></label>
      <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded-lg border border-ink-300 bg-ink-50 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-colors">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-100 text-brand-700 text-xs font-medium rounded-full">
            #{tag}
            <button type="button" onClick={() => remove(tag)} className="hover:text-brand-900">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          placeholder={value.length < 10 ? 'Add a tag, press Enter' : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-ink-900 placeholder-ink-400 outline-none"
        />
      </div>
    </div>
  );
}

// ── File upload zone ──────────────────────────────────────────────────────────

interface FileZoneProps {
  promptType: 'video' | 'image';
  file: File | null;
  preview: string | null;
  onFile: (f: File) => void;
  onClear: () => void;
  uploading: boolean;
  progress: number;
}

function FileZone({ promptType, file, preview, onFile, onClear, uploading, progress }: FileZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accept = promptType === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif';

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) validate(f);
  };

  const validate = (f: File) => {
    if (promptType === 'video' && !f.type.startsWith('video/')) { toast.error('Please upload a video file'); return; }
    if (promptType === 'image' && !f.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (f.size > MAX_FILE_SIZE) { toast.error('File must be under 100 MB'); return; }
    onFile(f);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-700 block">
        {promptType === 'video' ? 'Video Output' : 'Image Output'}{' '}
        <span className="text-ink-400 font-normal">(optional — upload the result your prompt created)</span>
      </label>

      {file ? (
        <div className="relative rounded-xl border border-ink-200 overflow-hidden bg-ink-50">
          {promptType === 'image' && preview && (
            <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" />
          )}
          {promptType === 'video' && preview && (
            <video src={preview} controls className="w-full max-h-64" />
          )}
          <div className="flex items-center gap-3 p-3 border-t border-ink-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-900 truncate">{file.name}</p>
              <p className="text-xs text-ink-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            {!uploading && (
              <button type="button" onClick={onClear} className="p-1.5 rounded-md hover:bg-ink-200 text-ink-500 hover:text-danger transition-colors">
                <X size={15} />
              </button>
            )}
          </div>
          {uploading && (
            <div className="px-3 pb-3">
              <div className="flex justify-between text-xs text-ink-500 mb-1">
                <span>Uploading…</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200',
            dragging ? 'border-brand-400 bg-brand-50' : 'border-ink-300 hover:border-ink-400 hover:bg-ink-50',
          )}
        >
          {promptType === 'video' ? (
            <Film size={28} className="text-ink-400" />
          ) : (
            <ImageIcon size={28} className="text-ink-400" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-ink-700">Drop your {promptType} here or click to browse</p>
            <p className="text-xs text-ink-500 mt-0.5">
              {promptType === 'video' ? 'MP4, WebM, MOV' : 'JPG, PNG, WebP, GIF'} — max 100 MB
            </p>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) validate(f); e.target.value = ''; }}
      />
    </div>
  );
}

// ── Custom select ─────────────────────────────────────────────────────────────

function PlatformSelect({
  options, value, onChange, placeholder, error,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-sm font-medium text-ink-700 block">Platform *</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center justify-between h-11 px-3 rounded-lg border bg-white text-sm transition-colors',
            error ? 'border-danger' : 'border-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100',
            value ? 'text-ink-900' : 'text-ink-400',
          )}
        >
          {value || placeholder}
          <ChevronDown size={16} className={cn('text-ink-400 transition-transform', open && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute z-50 w-full mt-1 bg-white border border-ink-200 rounded-xl shadow-lg overflow-hidden"
            >
              {options.map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt); setOpen(false); }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm transition-colors',
                      value === opt ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-800 hover:bg-ink-50',
                    )}
                  >
                    {opt}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SubmitPromptPage() {
  const [promptType, setPromptType] = useState<'video' | 'image'>('video');
  const [platform, setPlatform] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const platforms = promptType === 'video' ? VIDEO_PLATFORMS : IMAGE_PLATFORMS;

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleMediaFile = (f: File) => {
    setMediaFile(f);
    const url = URL.createObjectURL(f);
    setMediaPreview(url);
  };

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
  };

  const uploadMedia = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    return new Promise((resolve, reject) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const url = `${supabaseUrl}/storage/v1/object/submission-media/${path}`;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(path);
        else reject(new Error('Upload failed'));
      });
      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.send(file);
    });
  };

  const onSubmit = async (data: FormData) => {
    if (!platform) { toast.error('Please select a platform'); return; }

    let mediaPath: string | null = null;
    let mediaType: 'image' | 'video' | null = null;

    if (mediaFile) {
      setUploading(true);
      setUploadProgress(0);
      try {
        mediaPath = await uploadMedia(mediaFile);
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      } catch {
        toast.error('File upload failed. Please try again.');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const { error } = await supabase.from('community_submissions').insert({
      submitter_name: data.submitter_name.trim(),
      submitter_email: data.submitter_email?.trim() || null,
      prompt_type: promptType,
      platform,
      title: data.title.trim(),
      prompt_text: data.prompt_text.trim(),
      notes: data.notes?.trim() || null,
      tags,
      media_path: mediaPath,
      media_type: mediaType,
    });

    if (error) {
      toast.error('Submission failed. Please try again.');
      return;
    }

    setSubmitted(true);
    reset();
    setTags([]);
    setPlatform('');
    clearMedia();
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-display font-extrabold text-ink-900 tracking-tight mb-2">Submission received!</h1>
          <p className="text-ink-500 mb-6">
            Thank you for sharing your prompt. Our team will review it and, if approved, it will appear in the Explore feed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setSubmitted(false)}
              className="px-5 py-2.5 rounded-xl border border-ink-300 text-sm font-semibold text-ink-700 hover:bg-ink-50 transition-colors"
            >
              Submit another
            </button>
            <Link
              to="/explore"
              className="px-5 py-2.5 rounded-xl bg-ink-900 text-sm font-semibold text-white hover:bg-ink-800 transition-colors"
            >
              Browse prompts
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-ink-200 bg-white/80 backdrop-blur-sm sticky top-14 z-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-display font-extrabold text-ink-900 tracking-tight">Submit a Master Prompt</h1>
            <p className="text-sm text-ink-500 mt-0.5">Share your best AI prompt with the community</p>
          </div>
          <Link to="/explore" className="text-sm text-ink-500 hover:text-ink-900 transition-colors flex-shrink-0">
            ← Back to Explore
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Prompt type selector */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink-700">What type of prompt are you submitting? *</p>
          <div className="grid grid-cols-2 gap-3">
            {(['video', 'image'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { setPromptType(type); setPlatform(''); }}
                className={cn(
                  'flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-150',
                  promptType === type
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400',
                )}
              >
                {type === 'video' ? <Film size={28} /> : <ImageIcon size={28} />}
                <span className="text-sm font-semibold capitalize">{type} Prompt</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* About you */}
          <div className="rounded-xl border border-ink-200 p-5 space-y-4 bg-ink-50/50">
            <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wide">About you</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Your Name *"
                placeholder="e.g. Alex Johnson"
                error={errors.submitter_name?.message}
                {...register('submitter_name')}
              />
              <Input
                label="Email (optional)"
                type="email"
                placeholder="you@example.com"
                error={errors.submitter_email?.message}
                {...register('submitter_email')}
              />
            </div>
          </div>

          {/* Prompt details */}
          <div className="rounded-xl border border-ink-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wide">Prompt details</h2>

            <PlatformSelect
              options={platforms}
              value={platform}
              onChange={setPlatform}
              placeholder="Select AI tool / platform"
              error={!platform && undefined}
            />

            <Input
              label="Title *"
              placeholder="Give your prompt a clear, memorable title"
              error={errors.title?.message}
              {...register('title')}
            />

            <Textarea
              label="Prompt Text *"
              placeholder="Paste your full prompt here — the more detail the better"
              rows={6}
              error={errors.prompt_text?.message}
              {...register('prompt_text')}
            />

            <Textarea
              label="Notes (optional)"
              placeholder="Any tips, settings, or context that helps others use this prompt"
              rows={3}
              {...register('notes')}
            />

            <TagsInput value={tags} onChange={setTags} />
          </div>

          {/* Media upload */}
          <div className="rounded-xl border border-ink-200 p-5">
            <FileZone
              promptType={promptType}
              file={mediaFile}
              preview={mediaPreview}
              onFile={handleMediaFile}
              onClear={clearMedia}
              uploading={uploading}
              progress={uploadProgress}
            />
          </div>

          {/* Submit */}
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              loading={isSubmitting || uploading}
              disabled={isSubmitting || uploading}
              className="w-full"
              size="lg"
            >
              <Upload size={16} />
              {uploading ? `Uploading… ${uploadProgress}%` : 'Submit Prompt'}
            </Button>
            <p className="text-xs text-ink-400 text-center">
              Submissions are reviewed before appearing publicly. By submitting you agree to share this prompt with the community.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
