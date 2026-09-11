import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_path: string | null;
  bio: string;
  headline: string;
  location: string;
  website_url: string;
  linkedin_url: string;
  github_url: string;
  twitter_url: string;
  instagram_url: string;
  college: string;
  school: string;
  college_year: string;
  school_year: string;
  degree: string;
  experience_years: number;
  experience_title: string;
  experience_company: string;
  skills: string[];
  is_portfolio_public: boolean;
  portfolio_slug: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      return data as UserProfile | null;
    },
    enabled: !!user,
  });
}

export function getAvatarUrl(avatarPath: string): string {
  const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
  return data.publicUrl;
}
