export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      action_jobs: {
        Row: {
          career_id: string
          created_at: string
          job_key: string
          result: Json | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          career_id: string
          created_at?: string
          job_key: string
          result?: Json | null
          status: string
          token?: string
          updated_at?: string
        }
        Update: {
          career_id?: string
          created_at?: string
          job_key?: string
          result?: Json | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_jobs_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          career_id: string | null
          created_at: string
          estimated_cost_usd: number
          feature: string
          game_id: string | null
          id: string
          input_tokens: number
          meta: Json
          model: string
          output_tokens: number
          request_count: number
          total_tokens: number
          universe_id: string | null
        }
        Insert: {
          career_id?: string | null
          created_at?: string
          estimated_cost_usd?: number
          feature: string
          game_id?: string | null
          id?: string
          input_tokens?: number
          meta?: Json
          model: string
          output_tokens?: number
          request_count?: number
          total_tokens?: number
          universe_id?: string | null
        }
        Update: {
          career_id?: string | null
          created_at?: string
          estimated_cost_usd?: number
          feature?: string
          game_id?: string | null
          id?: string
          input_tokens?: number
          meta?: Json
          model?: string
          output_tokens?: number
          request_count?: number
          total_tokens?: number
          universe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_universe_id_fkey"
            columns: ["universe_id"]
            isOneToOne: false
            referencedRelation: "universes"
            referencedColumns: ["id"]
          },
        ]
      }
      award_snapshots: {
        Row: {
          as_of_date: string
          award: string
          career_id: string
          created_at: string
          id: string
          language: string
          note: string | null
          rank: number
          score: number | null
          season_id: string
        }
        Insert: {
          as_of_date: string
          award: string
          career_id: string
          created_at?: string
          id?: string
          language?: string
          note?: string | null
          rank: number
          score?: number | null
          season_id: string
        }
        Update: {
          as_of_date?: string
          award?: string
          career_id?: string
          created_at?: string
          id?: string
          language?: string
          note?: string | null
          rank?: number
          score?: number | null
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_snapshots_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_snapshots_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      career_contracts: {
        Row: {
          agent_fee_pct: number
          annual_value: number
          brand: string
          career_id: string
          category: string
          created_at: string
          end_date: string
          expires_on: string
          id: string
          kind: string
          language: string
          offered_on: string
          signed_at: string | null
          signing_bonus: number
          start_date: string
          status: string
          team_id: string | null
          terms: Json
        }
        Insert: {
          agent_fee_pct: number
          annual_value: number
          brand: string
          career_id: string
          category: string
          created_at?: string
          end_date: string
          expires_on: string
          id?: string
          kind: string
          language: string
          offered_on: string
          signed_at?: string | null
          signing_bonus?: number
          start_date: string
          status?: string
          team_id?: string | null
          terms?: Json
        }
        Update: {
          agent_fee_pct?: number
          annual_value?: number
          brand?: string
          career_id?: string
          category?: string
          created_at?: string
          end_date?: string
          expires_on?: string
          id?: string
          kind?: string
          language?: string
          offered_on?: string
          signed_at?: string | null
          signing_bonus?: number
          start_date?: string
          status?: string
          team_id?: string | null
          terms?: Json
        }
        Relationships: [
          {
            foreignKeyName: "career_contracts_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_contracts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "career_contracts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      career_events: {
        Row: {
          career_id: string
          created_at: string
          description: string
          event_date: string
          event_type: string
          from_team_id: string | null
          id: string
          language: string
          metadata: Json
          title: string | null
          to_team_id: string | null
        }
        Insert: {
          career_id: string
          created_at?: string
          description: string
          event_date: string
          event_type: string
          from_team_id?: string | null
          id?: string
          language?: string
          metadata?: Json
          title?: string | null
          to_team_id?: string | null
        }
        Update: {
          career_id?: string
          created_at?: string
          description?: string
          event_date?: string
          event_type?: string
          from_team_id?: string | null
          id?: string
          language?: string
          metadata?: Json
          title?: string | null
          to_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_events_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_events_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "career_events_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_events_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "career_events_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      career_ledger: {
        Row: {
          agent_fee: number
          career_id: string
          contract_id: string
          created_at: string
          gross: number
          id: string
          kind: string
          net: number
          paid_on: string
          period_end: string
          period_start: string
        }
        Insert: {
          agent_fee: number
          career_id: string
          contract_id: string
          created_at?: string
          gross: number
          id?: string
          kind: string
          net: number
          paid_on: string
          period_end: string
          period_start: string
        }
        Update: {
          agent_fee?: number
          career_id?: string
          contract_id?: string
          created_at?: string
          gross?: number
          id?: string
          kind?: string
          net?: number
          paid_on?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_ledger_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_ledger_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "career_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      career_profiles: {
        Row: {
          created_at: string
          current_team_id: string | null
          draft_pick: number | null
          draft_round: number | null
          draft_year: number | null
          id: string
          jersey_number: number | null
          overall: number
          player_name: string
          position: string | null
          rookie_season_id: string | null
          status: string
          universe_date: string
          universe_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_team_id?: string | null
          draft_pick?: number | null
          draft_round?: number | null
          draft_year?: number | null
          id?: string
          jersey_number?: number | null
          overall?: number
          player_name: string
          position?: string | null
          rookie_season_id?: string | null
          status?: string
          universe_date: string
          universe_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_team_id?: string | null
          draft_pick?: number | null
          draft_round?: number | null
          draft_year?: number | null
          id?: string
          jersey_number?: number | null
          overall?: number
          player_name?: string
          position?: string | null
          rookie_season_id?: string | null
          status?: string
          universe_date?: string
          universe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_profiles_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "career_profiles_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_profiles_rookie_season_id_fkey"
            columns: ["rookie_season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_profiles_universe_id_fkey"
            columns: ["universe_id"]
            isOneToOne: false
            referencedRelation: "universes"
            referencedColumns: ["id"]
          },
        ]
      }
      career_records: {
        Row: {
          career_id: string
          category: string
          game_id: string | null
          id: string
          label: string
          language: string
          scope: string
          season_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          career_id: string
          category: string
          game_id?: string | null
          id?: string
          label: string
          language?: string
          scope: string
          season_id?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          career_id?: string
          category?: string
          game_id?: string | null
          id?: string
          label?: string
          language?: string
          scope?: string
          season_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "career_records_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_records_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_records_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      fanbase_metrics: {
        Row: {
          approval: number
          career_id: string
          heat: number
          id: string
          segment: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          approval?: number
          career_id: string
          heat?: number
          id?: string
          segment: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          approval?: number
          career_id?: string
          heat?: number
          id?: string
          segment?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fanbase_metrics_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fanbase_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fanbase_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_notables: {
        Row: {
          career_id: string | null
          created_at: string
          game_id: string
          id: string
          note: string
          notes_language: string
          player_name: string
          team_abbreviation: string | null
        }
        Insert: {
          career_id?: string | null
          created_at?: string
          game_id: string
          id?: string
          note: string
          notes_language?: string
          player_name: string
          team_abbreviation?: string | null
        }
        Update: {
          career_id?: string | null
          created_at?: string
          game_id?: string
          id?: string
          note?: string
          notes_language?: string
          player_name?: string
          team_abbreviation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_notables_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_notables_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          broadcast: string | null
          counts_toward_standings: boolean
          created_at: string
          data_source: string | null
          external_id: string | null
          game_date: string
          game_day: string
          home_score: number | null
          home_team_id: string | null
          id: string
          notes: string | null
          notes_language: string
          season_id: string
          source_key: string
          stage: string
          status: string
          universe_id: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          broadcast?: string | null
          counts_toward_standings?: boolean
          created_at?: string
          data_source?: string | null
          external_id?: string | null
          game_date: string
          game_day: string
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          notes?: string | null
          notes_language?: string
          season_id: string
          source_key: string
          stage?: string
          status?: string
          universe_id?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          broadcast?: string | null
          counts_toward_standings?: boolean
          created_at?: string
          data_source?: string | null
          external_id?: string | null
          game_date?: string
          game_day?: string
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          notes?: string | null
          notes_language?: string
          season_id?: string
          source_key?: string
          stage?: string
          status?: string
          universe_id?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_universe_id_fkey"
            columns: ["universe_id"]
            isOneToOne: false
            referencedRelation: "universes"
            referencedColumns: ["id"]
          },
        ]
      }
      injuries: {
        Row: {
          career_id: string
          created_at: string
          end_date: string | null
          games_missed: number
          id: string
          injury: string
          notes: string | null
          notes_language: string
          severity: string | null
          source_game_id: string | null
          start_date: string
          status: string
        }
        Insert: {
          career_id: string
          created_at?: string
          end_date?: string | null
          games_missed?: number
          id?: string
          injury: string
          notes?: string | null
          notes_language?: string
          severity?: string | null
          source_game_id?: string | null
          start_date: string
          status?: string
        }
        Update: {
          career_id?: string
          created_at?: string
          end_date?: string | null
          games_missed?: number
          id?: string
          injury?: string
          notes?: string | null
          notes_language?: string
          severity?: string | null
          source_game_id?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "injuries_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injuries_source_game_id_fkey"
            columns: ["source_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          answer_text: string | null
          answered_option: string | null
          career_id: string
          context: string | null
          created_at: string
          game_id: string | null
          id: string
          impact: Json
          importance: number
          interview_date: string
          language: string
          options: Json
          outlet: string | null
          question: string
          reporter_name: string | null
          status: string
          tone: string | null
          topic: string | null
        }
        Insert: {
          answer_text?: string | null
          answered_option?: string | null
          career_id: string
          context?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          impact?: Json
          importance?: number
          interview_date: string
          language?: string
          options?: Json
          outlet?: string | null
          question: string
          reporter_name?: string | null
          status?: string
          tone?: string | null
          topic?: string | null
        }
        Update: {
          answer_text?: string | null
          answered_option?: string | null
          career_id?: string
          context?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          impact?: Json
          importance?: number
          interview_date?: string
          language?: string
          options?: Json
          outlet?: string | null
          question?: string
          reporter_name?: string | null
          status?: string
          tone?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_scores: {
        Row: {
          breakdown: Json
          career_id: string
          score: number
          updated_at: string
        }
        Insert: {
          breakdown?: Json
          career_id: string
          score?: number
          updated_at?: string
        }
        Update: {
          breakdown?: Json
          career_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_scores_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: true
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_posts: {
        Row: {
          author_name: string | null
          body: string
          career_id: string
          created_at: string
          game_id: string | null
          generation_source: string
          headline: string
          id: string
          kind: string
          language: string
          outlet: string
          player_stat_id: string | null
          tone: string | null
          virality: number
        }
        Insert: {
          author_name?: string | null
          body: string
          career_id: string
          created_at?: string
          game_id?: string | null
          generation_source?: string
          headline: string
          id?: string
          kind: string
          language?: string
          outlet: string
          player_stat_id?: string | null
          tone?: string | null
          virality?: number
        }
        Update: {
          author_name?: string | null
          body?: string
          career_id?: string
          created_at?: string
          game_id?: string | null
          generation_source?: string
          headline?: string
          id?: string
          kind?: string
          language?: string
          outlet?: string
          player_stat_id?: string | null
          tone?: string | null
          virality?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_posts_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_player_stat_id_fkey"
            columns: ["player_stat_id"]
            isOneToOne: false
            referencedRelation: "player_game_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          achieved_at: string
          career_id: string
          code: string
          description: string
          game_id: string | null
          id: string
          language: string
          title: string
        }
        Insert: {
          achieved_at?: string
          career_id: string
          code: string
          description: string
          game_id?: string | null
          id?: string
          language?: string
          title: string
        }
        Update: {
          achieved_at?: string
          career_id?: string
          code?: string
          description?: string
          game_id?: string | null
          id?: string
          language?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_memories: {
        Row: {
          career_id: string
          id: string
          language: string
          memory: string
          persona_key: string
          persona_name: string
          role: string
          sentiment: number
          source_game_id: string | null
          stance: string
          updated_at: string
        }
        Insert: {
          career_id: string
          id?: string
          language?: string
          memory: string
          persona_key: string
          persona_name: string
          role: string
          sentiment?: number
          source_game_id?: string | null
          stance?: string
          updated_at?: string
        }
        Update: {
          career_id?: string
          id?: string
          language?: string
          memory?: string
          persona_key?: string
          persona_name?: string
          role?: string
          sentiment?: number
          source_game_id?: string | null
          stance?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_memories_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_memories_source_game_id_fkey"
            columns: ["source_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      player_game_stats: {
        Row: {
          appearance_status: string
          assists: number
          blocks: number
          career_id: string
          created_at: string
          ejected: boolean
          fga: number
          fgm: number
          flagrant_fouls: number
          fouled_out: boolean
          fouls: number
          fta: number
          ftm: number
          game_id: string
          id: string
          injured: boolean
          injury_note: string | null
          localized_notes: Json
          minutes: number
          notes_language: string
          plus_minus: number | null
          points: number
          rebounds: number
          started: boolean
          steals: number
          story_notes: string | null
          team_id: string
          technical_fouls: number
          tpa: number
          tpm: number
          turnovers: number
          updated_at: string
        }
        Insert: {
          appearance_status?: string
          assists?: number
          blocks?: number
          career_id: string
          created_at?: string
          ejected?: boolean
          fga?: number
          fgm?: number
          flagrant_fouls?: number
          fouled_out?: boolean
          fouls?: number
          fta?: number
          ftm?: number
          game_id: string
          id?: string
          injured?: boolean
          injury_note?: string | null
          localized_notes?: Json
          minutes?: number
          notes_language?: string
          plus_minus?: number | null
          points?: number
          rebounds?: number
          started?: boolean
          steals?: number
          story_notes?: string | null
          team_id: string
          technical_fouls?: number
          tpa?: number
          tpm?: number
          turnovers?: number
          updated_at?: string
        }
        Update: {
          appearance_status?: string
          assists?: number
          blocks?: number
          career_id?: string
          created_at?: string
          ejected?: boolean
          fga?: number
          fgm?: number
          flagrant_fouls?: number
          fouled_out?: boolean
          fouls?: number
          fta?: number
          ftm?: number
          game_id?: string
          id?: string
          injured?: boolean
          injury_note?: string | null
          localized_notes?: Json
          minutes?: number
          notes_language?: string
          plus_minus?: number | null
          points?: number
          rebounds?: number
          started?: boolean
          steals?: number
          story_notes?: string | null
          team_id?: string
          technical_fouls?: number
          tpa?: number
          tpm?: number
          turnovers?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_game_stats_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      postgame_grades: {
        Row: {
          career_id: string
          created_at: string
          defense: number
          discipline: number
          efficiency: number
          game_id: string
          id: string
          language: string
          overall_grade: string
          playmaking: number
          scoring: number
          summary: string
        }
        Insert: {
          career_id: string
          created_at?: string
          defense: number
          discipline: number
          efficiency: number
          game_id: string
          id?: string
          language?: string
          overall_grade: string
          playmaking: number
          scoring: number
          summary: string
        }
        Update: {
          career_id?: string
          created_at?: string
          defense?: number
          discipline?: number
          efficiency?: number
          game_id?: string
          id?: string
          language?: string
          overall_grade?: string
          playmaking?: number
          scoring?: number
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "postgame_grades_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postgame_grades_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      pregame_coverage: {
        Row: {
          body: string
          career_id: string
          created_at: string
          expert_picks: Json
          game_id: string
          headline: string
          id: string
          key_question: string
          language: string
        }
        Insert: {
          body: string
          career_id: string
          created_at?: string
          expert_picks?: Json
          game_id: string
          headline: string
          id?: string
          key_question: string
          language?: string
        }
        Update: {
          body?: string
          career_id?: string
          created_at?: string
          expert_picks?: Json
          game_id?: string
          headline?: string
          id?: string
          key_question?: string
          language?: string
        }
        Relationships: [
          {
            foreignKeyName: "pregame_coverage_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregame_coverage_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          career_id: string
          id: string
          notes: string | null
          person_name: string
          role: string | null
          sentiment: number
          updated_at: string
        }
        Insert: {
          career_id: string
          id?: string
          notes?: string | null
          person_name: string
          role?: string | null
          sentiment?: number
          updated_at?: string
        }
        Update: {
          career_id?: string
          id?: string
          notes?: string | null
          person_name?: string
          role?: string | null
          sentiment?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rivalries: {
        Row: {
          career_id: string
          heat: number
          id: string
          last_game_id: string | null
          losses: number
          meetings: number
          notes_language: string
          opponent_team_id: string | null
          person_name: string | null
          reason: string | null
          rivalry_type: string
          status: string
          updated_at: string
          wins: number
        }
        Insert: {
          career_id: string
          heat?: number
          id?: string
          last_game_id?: string | null
          losses?: number
          meetings?: number
          notes_language?: string
          opponent_team_id?: string | null
          person_name?: string | null
          reason?: string | null
          rivalry_type?: string
          status?: string
          updated_at?: string
          wins?: number
        }
        Update: {
          career_id?: string
          heat?: number
          id?: string
          last_game_id?: string | null
          losses?: number
          meetings?: number
          notes_language?: string
          opponent_team_id?: string | null
          person_name?: string | null
          reason?: string | null
          rivalry_type?: string
          status?: string
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "rivalries_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rivalries_last_game_id_fkey"
            columns: ["last_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rivalries_opponent_team_id_fkey"
            columns: ["opponent_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "rivalries_opponent_team_id_fkey"
            columns: ["opponent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_sync_log: {
        Row: {
          created_at: string
          errors: Json
          id: string
          imported_count: number
          skipped_count: number
          source: string
        }
        Insert: {
          created_at?: string
          errors?: Json
          id?: string
          imported_count?: number
          skipped_count?: number
          source: string
        }
        Update: {
          created_at?: string
          errors?: Json
          id?: string
          imported_count?: number
          skipped_count?: number
          source?: string
        }
        Relationships: []
      }
      screenshot_scans: {
        Row: {
          career_id: string
          created_at: string
          field_confidence: Json
          game_id: string | null
          id: string
          language: string
          overall_confidence: number
          recognized_values: Json
        }
        Insert: {
          career_id: string
          created_at?: string
          field_confidence?: Json
          game_id?: string | null
          id?: string
          language?: string
          overall_confidence?: number
          recognized_values?: Json
        }
        Update: {
          career_id?: string
          created_at?: string
          field_confidence?: Json
          game_id?: string | null
          id?: string
          language?: string
          overall_confidence?: number
          recognized_values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "screenshot_scans_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshot_scans_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      season_goals: {
        Row: {
          career_id: string
          code: string
          id: string
          language: string
          metadata: Json
          progress: number
          season_id: string
          status: string
          target: number
          title: string
          updated_at: string
        }
        Insert: {
          career_id: string
          code: string
          id?: string
          language?: string
          metadata?: Json
          progress?: number
          season_id: string
          status?: string
          target?: number
          title: string
          updated_at?: string
        }
        Update: {
          career_id?: string
          code?: string
          id?: string
          language?: string
          metadata?: Json
          progress?: number
          season_id?: string
          status?: string
          target?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_goals_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_goals_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_recaps: {
        Row: {
          career_id: string
          created_at: string
          highlights: Json
          id: string
          language: string
          legacy_delta: number
          season_id: string
          stats: Json
          summary: string
          title: string
        }
        Insert: {
          career_id: string
          created_at?: string
          highlights?: Json
          id?: string
          language?: string
          legacy_delta?: number
          season_id: string
          stats?: Json
          summary: string
          title: string
        }
        Update: {
          career_id?: string
          created_at?: string
          highlights?: Json
          id?: string
          language?: string
          legacy_delta?: number
          season_id?: string
          stats?: Json
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_recaps_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_recaps_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          current: boolean
          end_date: string
          id: string
          label: string
          start_date: string
        }
        Insert: {
          created_at?: string
          current?: boolean
          end_date: string
          id?: string
          label: string
          start_date: string
        }
        Update: {
          created_at?: string
          current?: boolean
          end_date?: string
          id?: string
          label?: string
          start_date?: string
        }
        Relationships: []
      }
      story_arcs: {
        Row: {
          career_id: string
          category: string
          created_at: string
          id: string
          intensity: number
          language: string
          metadata: Json
          resolved_on: string | null
          started_on: string
          status: string
          summary: string
          title: string
        }
        Insert: {
          career_id: string
          category: string
          created_at?: string
          id?: string
          intensity?: number
          language?: string
          metadata?: Json
          resolved_on?: string | null
          started_on: string
          status?: string
          summary: string
          title: string
        }
        Update: {
          career_id?: string
          category?: string
          created_at?: string
          id?: string
          intensity?: number
          language?: string
          metadata?: Json
          resolved_on?: string | null
          started_on?: string
          status?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_arcs_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_stints: {
        Row: {
          acquisition: string | null
          career_id: string
          created_at: string
          departure: string | null
          end_date: string | null
          id: string
          notes_language: string
          start_date: string
          team_id: string
        }
        Insert: {
          acquisition?: string | null
          career_id: string
          created_at?: string
          departure?: string | null
          end_date?: string | null
          id?: string
          notes_language?: string
          start_date: string
          team_id: string
        }
        Update: {
          acquisition?: string | null
          career_id?: string
          created_at?: string
          departure?: string | null
          end_date?: string | null
          id?: string
          notes_language?: string
          start_date?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_stints_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_stints_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_stints_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          abbreviation: string
          active: boolean
          city: string
          conference: string | null
          created_at: string
          division: string | null
          id: string
          name: string
          nba_id: string | null
          primary_color: string | null
          secondary_color: string | null
        }
        Insert: {
          abbreviation: string
          active?: boolean
          city: string
          conference?: string | null
          created_at?: string
          division?: string | null
          id?: string
          name: string
          nba_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
        }
        Update: {
          abbreviation?: string
          active?: boolean
          city?: string
          conference?: string | null
          created_at?: string
          division?: string | null
          id?: string
          name?: string
          nba_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
        }
        Relationships: []
      }
      trade_interest: {
        Row: {
          career_id: string
          created_at: string
          id: string
          interest_score: number
          language: string
          rationale: string | null
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          career_id: string
          created_at?: string
          id?: string
          interest_score: number
          language?: string
          rationale?: string | null
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          career_id?: string
          created_at?: string
          id?: string
          interest_score?: number
          language?: string
          rationale?: string | null
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_interest_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_interest_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "trade_interest_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_offers: {
        Row: {
          accepted_at: string | null
          career_id: string
          created_at: string
          fairness_score: number
          from_team_id: string | null
          generated_by: string
          id: string
          interest_score: number
          language: string
          package_summary: string
          pressure: string | null
          rationale: string | null
          status: string
          to_team_id: string
        }
        Insert: {
          accepted_at?: string | null
          career_id: string
          created_at?: string
          fairness_score?: number
          from_team_id?: string | null
          generated_by?: string
          id?: string
          interest_score?: number
          language?: string
          package_summary: string
          pressure?: string | null
          rationale?: string | null
          status?: string
          to_team_id: string
        }
        Update: {
          accepted_at?: string | null
          career_id?: string
          created_at?: string
          fairness_score?: number
          from_team_id?: string | null
          generated_by?: string
          id?: string
          interest_score?: number
          language?: string
          package_summary?: string
          pressure?: string | null
          rationale?: string | null
          status?: string
          to_team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_offers_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_offers_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "trade_offers_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_offers_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "trade_offers_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_saga_updates: {
        Row: {
          body: string
          created_at: string
          headline: string
          id: string
          kind: string
          language: string
          saga_id: string
          update_date: string
        }
        Insert: {
          body: string
          created_at?: string
          headline: string
          id?: string
          kind: string
          language?: string
          saga_id: string
          update_date: string
        }
        Update: {
          body?: string
          created_at?: string
          headline?: string
          id?: string
          kind?: string
          language?: string
          saga_id?: string
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_saga_updates_saga_id_fkey"
            columns: ["saga_id"]
            isOneToOne: false
            referencedRelation: "trade_sagas"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_sagas: {
        Row: {
          career_id: string
          heat: number
          id: string
          language: string
          metadata: Json
          started_on: string
          status: string
          summary: string
          target_team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          career_id: string
          heat?: number
          id?: string
          language?: string
          metadata?: Json
          started_on: string
          status?: string
          summary: string
          target_team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          career_id?: string
          heat?: number
          id?: string
          language?: string
          metadata?: Json
          started_on?: string
          status?: string
          summary?: string
          target_team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_sagas_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_sagas_target_team_id_fkey"
            columns: ["target_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "trade_sagas_target_team_id_fkey"
            columns: ["target_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      trophies: {
        Row: {
          awarded_on: string
          career_id: string
          created_at: string
          detail: string | null
          id: string
          language: string
          season_id: string | null
          source: string
          title: string
          trophy_type: string
        }
        Insert: {
          awarded_on: string
          career_id: string
          created_at?: string
          detail?: string | null
          id?: string
          language?: string
          season_id?: string | null
          source?: string
          title: string
          trophy_type: string
        }
        Update: {
          awarded_on?: string
          career_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          language?: string
          season_id?: string | null
          source?: string
          title?: string
          trophy_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trophies_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophies_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      universe_games: {
        Row: {
          away_score: number | null
          completed_at: string | null
          created_at: string
          game_id: string
          home_score: number | null
          id: string
          localized_notes: Json
          notes_language: string
          status: string
          story_notes: string | null
          universe_id: string
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          completed_at?: string | null
          created_at?: string
          game_id: string
          home_score?: number | null
          id?: string
          localized_notes?: Json
          notes_language?: string
          status?: string
          story_notes?: string | null
          universe_id: string
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          completed_at?: string | null
          created_at?: string
          game_id?: string
          home_score?: number | null
          id?: string
          localized_notes?: Json
          notes_language?: string
          status?: string
          story_notes?: string | null
          universe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "universe_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universe_games_universe_id_fkey"
            columns: ["universe_id"]
            isOneToOne: false
            referencedRelation: "universes"
            referencedColumns: ["id"]
          },
        ]
      }
      universe_reputation: {
        Row: {
          career_id: string
          cultural_impact: number
          expert_respect: number
          fan_approval: number
          hater_heat: number
          league_reputation: number
          media_hype: number
          star_power: number
          updated_at: string
        }
        Insert: {
          career_id: string
          cultural_impact?: number
          expert_respect?: number
          fan_approval?: number
          hater_heat?: number
          league_reputation?: number
          media_hype?: number
          star_power?: number
          updated_at?: string
        }
        Update: {
          career_id?: string
          cultural_impact?: number
          expert_respect?: number
          fan_approval?: number
          hater_heat?: number
          league_reputation?: number
          media_hype?: number
          star_power?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "universe_reputation_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: true
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      universes: {
        Row: {
          created_at: string
          current_season_id: string | null
          id: string
          language: string
          name: string
          owner_id: string | null
          slug: string
          universe_date: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          current_season_id?: string | null
          id?: string
          language?: string
          name: string
          owner_id?: string | null
          slug?: string
          universe_date: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          current_season_id?: string | null
          id?: string
          language?: string
          name?: string
          owner_id?: string | null
          slug?: string
          universe_date?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "universes_current_season_id_fkey"
            columns: ["current_season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      world_settings: {
        Row: {
          auto_media: boolean
          auto_trade_rumors: boolean
          career_id: string
          current_season_id: string | null
          id: string
          media_intensity: number
          universe_date: string
          updated_at: string
        }
        Insert: {
          auto_media?: boolean
          auto_trade_rumors?: boolean
          career_id: string
          current_season_id?: string | null
          id?: string
          media_intensity?: number
          universe_date: string
          updated_at?: string
        }
        Update: {
          auto_media?: boolean
          auto_trade_rumors?: boolean
          career_id?: string
          current_season_id?: string | null
          id?: string
          media_intensity?: number
          universe_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_settings_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: true
            referencedRelation: "career_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_settings_current_season_id_fkey"
            columns: ["current_season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      standings: {
        Row: {
          abbreviation: string | null
          city: string | null
          losses: number | null
          name: string | null
          season_id: string | null
          team_id: string | null
          wins: number | null
        }
        Relationships: []
      }
      team_game_results: {
        Row: {
          game_id: string | null
          loss: number | null
          season_id: string | null
          team_id: string | null
          win: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      answer_career_interview: {
        Args: {
          p_actor: string
          p_career: string
          p_interview: string
          p_option: string
        }
        Returns: Json
      }
      claim_action: { Args: { p_career: string; p_key: string }; Returns: Json }
      create_career_universe: {
        Args: { p_actor: string; p_data: Json }
        Returns: string
      }
      move_career_team: {
        Args: {
          p_actor: string
          p_career: string
          p_date: string
          p_description: string
          p_offer?: string
          p_team: string
        }
        Returns: undefined
      }
      prepare_career_salary: {
        Args: {
          p_actor: string
          p_annual: number
          p_bonus: number
          p_career: string
          p_end: string
          p_start: string
        }
        Returns: string
      }
      replace_career_milestones: {
        Args: {
          p_actor: string
          p_career: string
          p_language: string
          p_rows: Json
        }
        Returns: undefined
      }
      replace_career_records: {
        Args: {
          p_actor: string
          p_career: string
          p_language: string
          p_rows: Json
        }
        Returns: undefined
      }
      respond_career_contract: {
        Args: {
          p_action: string
          p_actor: string
          p_career: string
          p_contract: string
        }
        Returns: Json
      }
      respond_trade_story: {
        Args: {
          p_actor: string
          p_career: string
          p_choice: string
          p_saga: string
        }
        Returns: Json
      }
      save_career_game: {
        Args: {
          p_actor: string
          p_career: string
          p_game: string
          p_payload: Json
        }
        Returns: Json
      }
      set_career_date: {
        Args: {
          p_actor: string
          p_career: string
          p_date: string
          p_season?: string
        }
        Returns: undefined
      }
      settle_career_contracts: {
        Args: { p_actor: string; p_career: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
