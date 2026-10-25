// Generated from the Supabase schema. Regenerate after each migration.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      app_user: {
        Row: {
          created_at: string
          display_name: string
          email: string
          role: Database['public']['Enums']['user_role']
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          role: Database['public']['Enums']['user_role']
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['app_user']['Insert']>
        Relationships: Rel[]
      }
      change_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          field: string
          id: number
          new_value: Json | null
          old_value: Json | null
          row_id: string
          table_name: string
        }
        Insert: never
        Update: never
        Relationships: Rel[]
      }
      dependency: {
        Row: {
          blocks_initiative_id: string
          initiative_id: string
        }
        Insert: {
          blocks_initiative_id: string
          initiative_id: string
        }
        Update: Partial<Database['public']['Tables']['dependency']['Insert']>
        Relationships: Rel[]
      }
      initiative: {
        Row: {
          actual_chf: number | null
          archived_at: string | null
          budget_chf: number | null
          budget_status: Database['public']['Enums']['budget_status']
          created_at: string
          decision_needed: boolean
          decision_question: string | null
          description: string | null
          due_date: string | null
          forecast_chf: number | null
          id: string
          key: string
          rag: Database['public']['Enums']['rag_color'] | null
          rag_reason: string | null
          rag_updated_at: string | null
          start_date: string | null
          status: Database['public']['Enums']['initiative_status']
          title: string
          updated_at: string
        }
        Insert: {
          actual_chf?: number | null
          archived_at?: string | null
          budget_chf?: number | null
          budget_status?: Database['public']['Enums']['budget_status']
          decision_needed?: boolean
          decision_question?: string | null
          description?: string | null
          due_date?: string | null
          forecast_chf?: number | null
          id?: string
          key?: string
          rag?: Database['public']['Enums']['rag_color'] | null
          rag_reason?: string | null
          start_date?: string | null
          status?: Database['public']['Enums']['initiative_status']
          title: string
        }
        Update: Partial<Database['public']['Tables']['initiative']['Insert']>
        Relationships: Rel[]
      }
      jira_link: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          initiative_id: string
          issue_key: string
          kind: Database['public']['Enums']['jira_link_kind']
          last_synced_at: string | null
          progress_pct: number | null
          source_id: string
          start_date: string | null
          status: string | null
          status_category: string | null
          summary: string | null
          sync_error: string | null
        }
        Insert: {
          id?: string
          initiative_id: string
          issue_key: string
          kind: Database['public']['Enums']['jira_link_kind']
          source_id: string
        }
        Update: Partial<Database['public']['Tables']['jira_link']['Insert']>
        Relationships: Rel[]
      }
      jira_source: {
        Row: {
          active: boolean
          auth_email: string
          base_url: string
          created_at: string
          id: string
          name: string
          secret_name: string
        }
        Insert: {
          active?: boolean
          auth_email: string
          base_url: string
          id?: string
          name: string
          secret_name: string
        }
        Update: Partial<Database['public']['Tables']['jira_source']['Insert']>
        Relationships: Rel[]
      }
      milestone: {
        Row: {
          created_at: string
          done: boolean
          due_date: string
          id: string
          initiative_id: string
          title: string
          updated_at: string
        }
        Insert: {
          done?: boolean
          due_date: string
          id?: string
          initiative_id: string
          title: string
        }
        Update: Partial<Database['public']['Tables']['milestone']['Insert']>
        Relationships: Rel[]
      }
      snapshot: {
        Row: {
          actual_chf: number | null
          budget_chf: number | null
          due_date: string | null
          forecast_chf: number | null
          id: number
          initiative_id: string
          rag: Database['public']['Enums']['rag_color'] | null
          status: Database['public']['Enums']['initiative_status']
          taken_at: string
        }
        Insert: never
        Update: never
        Relationships: Rel[]
      }
      sync_run: {
        Row: {
          error: string | null
          finished_at: string | null
          id: number
          ok: boolean | null
          started_at: string
          trigger: string
        }
        Insert: never
        Update: never
        Relationships: Rel[]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      budget_status: 'platzhalter' | 'beantragt' | 'bewilligt'
      initiative_status: 'geplant' | 'laufend' | 'abgeschlossen' | 'abgebrochen'
      jira_link_kind: 'epic' | 'jpd'
      rag_color: 'gruen' | 'gelb' | 'rot'
      user_role: 'entscheider' | 'pm' | 'leser'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
