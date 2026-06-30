export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          phone: string;
          referral_code: string;
          referred_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          referral_code: string;
          referred_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          referral_code?: string;
          referred_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_referred_by_fkey';
            columns: ['referred_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      missions: {
        Row: {
          id: string;
          title: string;
          description: string;
          points: number;
          active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          points: number;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          points?: number;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      mission_completions: {
        Row: {
          profile_id: string;
          mission_id: string;
          point_transaction_id: string | null;
          completed_at: string;
        };
        Insert: {
          profile_id: string;
          mission_id: string;
          point_transaction_id?: string | null;
          completed_at?: string;
        };
        Update: {
          profile_id?: string;
          mission_id?: string;
          point_transaction_id?: string | null;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mission_completions_mission_id_fkey';
            columns: ['mission_id'];
            isOneToOne: false;
            referencedRelation: 'missions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mission_completions_point_transaction_id_fkey';
            columns: ['point_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'point_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mission_completions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      point_transactions: {
        Row: {
          id: string;
          profile_id: string;
          amount: number;
          reason: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          amount: number;
          reason: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          amount?: number;
          reason?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'point_transactions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_mission: {
        Args: {
          p_profile_id: string;
          p_mission_id: string;
        };
        Returns: {
          points_balance: number;
          mission_id: string;
          mission_title: string;
          mission_description: string;
          mission_points: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
