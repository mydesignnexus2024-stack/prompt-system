export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other';

export interface Database {
  public: {
    Tables: {
      prompts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          prompt_text: string;
          platform: string;
          notes: string | null;
          tags: string[];
          status: 'draft' | 'ready' | 'posted' | 'archived';
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          prompt_text: string;
          platform: string;
          notes?: string | null;
          tags?: string[];
          status?: 'draft' | 'ready' | 'posted' | 'archived';
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          prompt_text?: string;
          platform?: string;
          notes?: string | null;
          tags?: string[];
          status?: 'draft' | 'ready' | 'posted' | 'archived';
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      media_files: {
        Row: {
          id: string;
          prompt_id: string;
          file_path: string;
          file_type: FileType;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          prompt_id: string;
          file_path: string;
          file_type: FileType;
          file_name: string;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          prompt_id?: string;
          file_path?: string;
          file_type?: FileType;
          file_name?: string;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

export type Prompt    = Database['public']['Tables']['prompts']['Row'];
export type MediaFile = Database['public']['Tables']['media_files']['Row'];

export const PLATFORMS = ['Veo 3', 'Seedance 2.0', 'Midjourney', 'ChatGPT', 'Claude', 'Other'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const STATUSES = ['draft', 'ready', 'posted', 'archived'] as const;
export type Status = (typeof STATUSES)[number];
