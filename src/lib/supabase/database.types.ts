// The live database, described for TypeScript: every table, its columns and the database functions
// (round 727). GENERATED, do not edit by hand. After a database change, make it again with:
//   npx.cmd supabase gen types typescript --project-id pemwbclxvdjqbyomumjc --schema public
// (paste the output under this comment). The database clients in this folder will use it one at a
// time, so a renamed or removed column fails the type check instead of the live page.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_push_devices: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_push_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: number
          invite_only: boolean
        }
        Insert: {
          id?: number
          invite_only?: boolean
        }
        Update: {
          id?: number
          invite_only?: boolean
        }
        Relationships: []
      }
      apple_signin_tokens: {
        Row: {
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          author_id: string
          author_tag: string
          body: string
          created_at: string
          id: string
          removed_at: string | null
          room: string
        }
        Insert: {
          author_id: string
          author_tag: string
          body: string
          created_at?: string
          id?: string
          removed_at?: string | null
          room: string
        }
        Update: {
          author_id?: string
          author_tag?: string
          body?: string
          created_at?: string
          id?: string
          removed_at?: string | null
          room?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claimed_imports: {
        Row: {
          done_at: string | null
          next_page: number
          started_at: string
          total_events: number | null
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          done_at?: string | null
          next_page?: number
          started_at?: string
          total_events?: number | null
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          done_at?: string | null
          next_page?: number
          started_at?: string
          total_events?: number | null
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claimed_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claimed_results: {
        Row: {
          doubles: boolean
          entrants: number
          event_id: number
          event_name: string
          game: string
          placement: number
          saved_at: string
          start_at: string | null
          tournament: string
          tournament_slug: string | null
          user_id: string
        }
        Insert: {
          doubles?: boolean
          entrants?: number
          event_id: number
          event_name: string
          game: string
          placement: number
          saved_at?: string
          start_at?: string | null
          tournament: string
          tournament_slug?: string | null
          user_id: string
        }
        Update: {
          doubles?: boolean
          entrants?: number
          event_id?: number
          event_name?: string
          game?: string
          placement?: number
          saved_at?: string
          start_at?: string | null
          tournament?: string
          tournament_slug?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claimed_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_suggestions: {
        Row: {
          character: string | null
          contact: string | null
          created_at: string
          details: string
          game: string | null
          id: string
          ip_hash: string | null
          kind: string
          link: string | null
          reviewed_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          character?: string | null
          contact?: string | null
          created_at?: string
          details?: string
          game?: string | null
          id?: string
          ip_hash?: string | null
          kind: string
          link?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          character?: string | null
          contact?: string | null
          created_at?: string
          details?: string
          game?: string | null
          id?: string
          ip_hash?: string | null
          kind?: string
          link?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string
          muted: boolean
          role: string
          status: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          muted?: boolean
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
          muted?: boolean
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          age_band: string
          created_at: string
          created_by: string | null
          direct_key: string | null
          id: string
          kind: string
          last_message_at: string
          title: string | null
        }
        Insert: {
          age_band: string
          created_at?: string
          created_by?: string | null
          direct_key?: string | null
          id?: string
          kind: string
          last_message_at?: string
          title?: string | null
        }
        Update: {
          age_band?: string
          created_at?: string
          created_by?: string | null
          direct_key?: string | null
          id?: string
          kind?: string
          last_message_at?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_link_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          host_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          host_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          host_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_link_codes_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_servers: {
        Row: {
          guild_id: string
          host_id: string
          linked_at: string
          linked_by: string | null
        }
        Insert: {
          guild_id: string
          host_id: string
          linked_at?: string
          linked_by?: string | null
        }
        Update: {
          guild_id?: string
          host_id?: string
          linked_at?: string
          linked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_servers_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_reports: {
        Row: {
          count: number
          digest: string | null
          fingerprint: string
          first_seen: string
          id: string
          last_seen: string
          message: string
          path: string | null
          resolved_at: string | null
          source: string
        }
        Insert: {
          count?: number
          digest?: string | null
          fingerprint: string
          first_seen?: string
          id?: string
          last_seen?: string
          message: string
          path?: string | null
          resolved_at?: string | null
          source: string
        }
        Update: {
          count?: number
          digest?: string | null
          fingerprint?: string
          first_seen?: string
          id?: string
          last_seen?: string
          message?: string
          path?: string | null
          resolved_at?: string | null
          source?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_kind: string
          event_name: string
          event_ref: string
          reminded_at: string | null
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_kind: string
          event_name: string
          event_ref: string
          reminded_at?: string | null
          starts_at: string
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          event_kind?: string
          event_name?: string
          event_ref?: string
          reminded_at?: string | null
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rulesets: {
        Row: {
          attached_by: string | null
          created_at: string
          game: string
          id: string
          ruleset_id: string
          target_key: string
          target_type: string
        }
        Insert: {
          attached_by?: string | null
          created_at?: string
          game: string
          id?: string
          ruleset_id: string
          target_key: string
          target_type: string
        }
        Update: {
          attached_by?: string | null
          created_at?: string
          game?: string
          id?: string
          ruleset_id?: string
          target_key?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rulesets_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rulesets_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["id"]
          },
        ]
      }
      events_sync: {
        Row: {
          data: Json | null
          id: number
          last_run: string
          running_since: string | null
          saved_at: string | null
        }
        Insert: {
          data?: Json | null
          id?: number
          last_run?: string
          running_since?: string | null
          saved_at?: string | null
        }
        Update: {
          data?: Json | null
          id?: number
          last_run?: string
          running_since?: string | null
          saved_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          status: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          status?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      highlight_votes: {
        Row: {
          created_at: string
          highlight_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          highlight_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          highlight_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlight_votes_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "highlights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlight_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          author_id: string
          character: string | null
          created_at: string
          description: string | null
          game: string
          guide_body: string | null
          id: string
          removed_at: string | null
          removed_reason: string | null
          search_vec: unknown
          title: string
          type: string
          url: string | null
          vote_count: number
          vs_character: string | null
        }
        Insert: {
          author_id: string
          character?: string | null
          created_at?: string
          description?: string | null
          game: string
          guide_body?: string | null
          id?: string
          removed_at?: string | null
          removed_reason?: string | null
          search_vec?: unknown
          title: string
          type: string
          url?: string | null
          vote_count?: number
          vs_character?: string | null
        }
        Update: {
          author_id?: string
          character?: string | null
          created_at?: string
          description?: string | null
          game?: string
          guide_body?: string | null
          id?: string
          removed_at?: string | null
          removed_reason?: string | null
          search_vec?: unknown
          title?: string
          type?: string
          url?: string | null
          vote_count?: number
          vs_character?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "highlights_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      history_moments: {
        Row: {
          added_by: string | null
          created_at: string
          game: string | null
          happened_on: string
          id: string
          link: string
          month_only: boolean
          note: string | null
          reviewed_at: string | null
          status: string
          suggested_by: string | null
          title: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          game?: string | null
          happened_on: string
          id?: string
          link: string
          month_only?: boolean
          note?: string | null
          reviewed_at?: string | null
          status?: string
          suggested_by?: string | null
          title: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          game?: string | null
          happened_on?: string
          id?: string
          link?: string
          month_only?: boolean
          note?: string | null
          reviewed_at?: string | null
          status?: string
          suggested_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "history_moments_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_moments_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      history_reports: {
        Row: {
          created_at: string
          id: string
          link: string | null
          major_slug: string | null
          message: string
          moment_id: string | null
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          major_slug?: string | null
          message: string
          moment_id?: string | null
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          major_slug?: string | null
          message?: string
          moment_id?: string | null
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "history_reports_major_slug_fkey"
            columns: ["major_slug"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "history_reports_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "history_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_cohosts: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosted_cohosts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_cohosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_connect_codes: {
        Row: {
          code: string
          event_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          event_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          event_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosted_connect_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_connect_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_entrants: {
        Row: {
          checked_in_at: string | null
          connect_code: string | null
          created_at: string
          event_id: string
          placement: number | null
          seed: number | null
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          connect_code?: string | null
          created_at?: string
          event_id: string
          placement?: number | null
          seed?: number | null
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          connect_code?: string | null
          created_at?: string
          event_id?: string
          placement?: number | null
          seed?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosted_entrants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_entrants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_events: {
        Row: {
          best_of: number
          best_of_top: number | null
          bracket_name: string | null
          bracket_version: number
          challonge_url: string | null
          checkin_minutes: number
          created_at: string
          description: string | null
          entrant_cap: number
          final_format: string | null
          final_size: number | null
          format: string
          game: string
          host_id: string
          id: string
          location: string | null
          name: string
          no_show_minutes: number | null
          official: boolean
          online: boolean
          parent_id: string | null
          region: string | null
          removed_at: string | null
          removed_reason: string | null
          ruleset_id: string | null
          series_id: string | null
          setups: number | null
          starts_at: string
          status: string
          swiss_rounds: number | null
          team_size: number
          timezone: string
        }
        Insert: {
          best_of?: number
          best_of_top?: number | null
          bracket_name?: string | null
          bracket_version?: number
          challonge_url?: string | null
          checkin_minutes?: number
          created_at?: string
          description?: string | null
          entrant_cap?: number
          final_format?: string | null
          final_size?: number | null
          format?: string
          game: string
          host_id: string
          id?: string
          location?: string | null
          name: string
          no_show_minutes?: number | null
          official?: boolean
          online?: boolean
          parent_id?: string | null
          region?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          ruleset_id?: string | null
          series_id?: string | null
          setups?: number | null
          starts_at: string
          status?: string
          swiss_rounds?: number | null
          team_size?: number
          timezone?: string
        }
        Update: {
          best_of?: number
          best_of_top?: number | null
          bracket_name?: string | null
          bracket_version?: number
          challonge_url?: string | null
          checkin_minutes?: number
          created_at?: string
          description?: string | null
          entrant_cap?: number
          final_format?: string | null
          final_size?: number | null
          format?: string
          game?: string
          host_id?: string
          id?: string
          location?: string | null
          name?: string
          no_show_minutes?: number | null
          official?: boolean
          online?: boolean
          parent_id?: string | null
          region?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          ruleset_id?: string | null
          series_id?: string | null
          setups?: number | null
          starts_at?: string
          status?: string
          swiss_rounds?: number | null
          team_size?: number
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosted_events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_events_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_events_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_events_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_guests: {
        Row: {
          checked_in_at: string | null
          created_at: string
          event_id: string
          id: string
          members_only: boolean
          placement: number | null
          seed: number | null
          tag: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          members_only?: boolean
          placement?: number | null
          seed?: number | null
          tag: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          members_only?: boolean
          placement?: number | null
          seed?: number | null
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosted_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_paid: {
        Row: {
          created_at: string
          entry_id: string
          event_id: string
          marked_by: string | null
        }
        Insert: {
          created_at?: string
          entry_id: string
          event_id: string
          marked_by?: string | null
        }
        Update: {
          created_at?: string
          entry_id?: string
          event_id?: string
          marked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hosted_paid_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_paid_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_sets: {
        Row: {
          best_of: number
          bracket: string
          completed_at: string | null
          event_id: string
          id: string
          identifier: string | null
          idx: number
          live: Json | null
          loser_slot: number | null
          loser_to: string | null
          p1_bye: boolean
          p1_id: string | null
          p1_score: number | null
          p2_bye: boolean
          p2_id: string | null
          p2_score: number | null
          pool: number | null
          round: number
          state: string
          updated_at: string
          winner: number | null
          winner_slot: number | null
          winner_to: string | null
        }
        Insert: {
          best_of?: number
          bracket: string
          completed_at?: string | null
          event_id: string
          id?: string
          identifier?: string | null
          idx: number
          live?: Json | null
          loser_slot?: number | null
          loser_to?: string | null
          p1_bye?: boolean
          p1_id?: string | null
          p1_score?: number | null
          p2_bye?: boolean
          p2_id?: string | null
          p2_score?: number | null
          pool?: number | null
          round: number
          state?: string
          updated_at?: string
          winner?: number | null
          winner_slot?: number | null
          winner_to?: string | null
        }
        Update: {
          best_of?: number
          bracket?: string
          completed_at?: string | null
          event_id?: string
          id?: string
          identifier?: string | null
          idx?: number
          live?: Json | null
          loser_slot?: number | null
          loser_to?: string | null
          p1_bye?: boolean
          p1_id?: string | null
          p1_score?: number | null
          p2_bye?: boolean
          p2_id?: string | null
          p2_score?: number | null
          pool?: number | null
          round?: number
          state?: string
          updated_at?: string
          winner?: number | null
          winner_slot?: number | null
          winner_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hosted_sets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_sets_loser_to_fkey"
            columns: ["loser_to"]
            isOneToOne: false
            referencedRelation: "hosted_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_sets_winner_to_fkey"
            columns: ["winner_to"]
            isOneToOne: false
            referencedRelation: "hosted_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_team_members: {
        Row: {
          event_id: string
          guest_id: string
          name: string
          slot: number
          user_id: string | null
        }
        Insert: {
          event_id: string
          guest_id: string
          name: string
          slot: number
          user_id?: string | null
        }
        Update: {
          event_id?: string
          guest_id?: string
          name?: string
          slot?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hosted_team_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_team_members_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "hosted_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_waitlist: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosted_waitlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_webhooks: {
        Row: {
          announced_at: string | null
          calls: boolean
          created_at: string
          created_by: string | null
          event_id: string
          url: string
        }
        Insert: {
          announced_at?: string | null
          calls?: boolean
          created_at?: string
          created_by?: string | null
          event_id: string
          url: string
        }
        Update: {
          announced_at?: string | null
          calls?: boolean
          created_at?: string
          created_by?: string | null
          event_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosted_webhooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_webhooks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          disabled: boolean
          expires_at: string | null
          max_uses: number
          note: string | null
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          disabled?: boolean
          expires_at?: string | null
          max_uses?: number
          note?: string | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          disabled?: boolean
          expires_at?: string | null
          max_uses?: number
          note?: string | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_redemptions: {
        Row: {
          code: string | null
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      ladder_matches: {
        Row: {
          counted: boolean | null
          created_at: string
          ended_at: string | null
          game: string
          id: string
          p1: string
          p1_change: number | null
          p1_connect: string
          p1_score: number | null
          p2: string
          p2_change: number | null
          p2_connect: string
          p2_score: number | null
          reported_at: string | null
          reported_by: string | null
          season: string
          status: string
        }
        Insert: {
          counted?: boolean | null
          created_at?: string
          ended_at?: string | null
          game: string
          id?: string
          p1: string
          p1_change?: number | null
          p1_connect: string
          p1_score?: number | null
          p2: string
          p2_change?: number | null
          p2_connect: string
          p2_score?: number | null
          reported_at?: string | null
          reported_by?: string | null
          season: string
          status?: string
        }
        Update: {
          counted?: boolean | null
          created_at?: string
          ended_at?: string | null
          game?: string
          id?: string
          p1?: string
          p1_change?: number | null
          p1_connect?: string
          p1_score?: number | null
          p2?: string
          p2_change?: number | null
          p2_connect?: string
          p2_score?: number | null
          reported_at?: string | null
          reported_by?: string | null
          season?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ladder_matches_p1_fkey"
            columns: ["p1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_matches_p2_fkey"
            columns: ["p2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_matches_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ladder_queue: {
        Row: {
          connect_info: string
          expires_at: string
          game: string
          joined_at: string
          region: string | null
          user_id: string
        }
        Insert: {
          connect_info: string
          expires_at?: string
          game: string
          joined_at?: string
          region?: string | null
          user_id: string
        }
        Update: {
          connect_info?: string
          expires_at?: string
          game?: string
          joined_at?: string
          region?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ladder_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ladder_ratings: {
        Row: {
          game: string
          losses: number
          rating: number
          season: string
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          game: string
          losses?: number
          rating?: number
          season: string
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          game?: string
          losses?: number
          rating?: number
          season?: string
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "ladder_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_players: {
        Row: {
          created_at: string
          division: number | null
          league_id: string
          seed: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          division?: number | null
          league_id: string
          seed?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          division?: number | null
          league_id?: string
          seed?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_players_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_sets: {
        Row: {
          created_at: string
          deadline: string
          division: number
          id: string
          league_id: string
          p1_id: string
          p1_score: number | null
          p2_id: string
          p2_score: number | null
          reported_at: string | null
          reported_by: string | null
          state: string
          week: number
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          deadline: string
          division: number
          id?: string
          league_id: string
          p1_id: string
          p1_score?: number | null
          p2_id: string
          p2_score?: number | null
          reported_at?: string | null
          reported_by?: string | null
          state?: string
          week: number
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string
          division?: number
          id?: string
          league_id?: string
          p1_id?: string
          p1_score?: number | null
          p2_id?: string
          p2_score?: number | null
          reported_at?: string | null
          reported_by?: string | null
          state?: string
          week?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_sets_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_sets_p1_id_fkey"
            columns: ["p1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_sets_p2_id_fkey"
            columns: ["p2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_sets_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_sets_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          best_of: number
          created_at: string
          description: string | null
          game: string
          host_id: string
          id: string
          location: string | null
          name: string
          online: boolean
          player_cap: number
          playoff_size: number | null
          region: string | null
          removed_at: string | null
          removed_reason: string | null
          ruleset_id: string | null
          starts_at: string
          status: string
          timezone: string
          weeks: number
        }
        Insert: {
          best_of?: number
          created_at?: string
          description?: string | null
          game: string
          host_id: string
          id?: string
          location?: string | null
          name: string
          online?: boolean
          player_cap?: number
          playoff_size?: number | null
          region?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          ruleset_id?: string | null
          starts_at: string
          status?: string
          timezone?: string
          weeks?: number
        }
        Update: {
          best_of?: number
          created_at?: string
          description?: string | null
          game?: string
          host_id?: string
          id?: string
          location?: string | null
          name?: string
          online?: boolean
          player_cap?: number
          playoff_size?: number | null
          region?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          ruleset_id?: string | null
          starts_at?: string
          status?: string
          timezone?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "leagues_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leagues_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["id"]
          },
        ]
      }
      live_reports: {
        Row: {
          author_id: string | null
          created_at: string
          details: string | null
          id: string
          kind: string
          reason: string
          reporter_id: string
          room: string | null
          snapshot: string
          status: string
          target_id: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          kind: string
          reason: string
          reporter_id: string
          room?: string | null
          snapshot: string
          status?: string
          target_id: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          kind?: string
          reason?: string
          reporter_id?: string
          room?: string | null
          snapshot?: string
          status?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_reports_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lobbies: {
        Row: {
          closed_at: string | null
          closes_at: string
          connect_info: string
          created_at: string
          game: string
          host_id: string
          id: string
          mode: string
          notes: string | null
          region: string
          skill: string
          title: string
        }
        Insert: {
          closed_at?: string | null
          closes_at: string
          connect_info: string
          created_at?: string
          game: string
          host_id: string
          id?: string
          mode?: string
          notes?: string | null
          region?: string
          skill?: string
          title: string
        }
        Update: {
          closed_at?: string | null
          closes_at?: string
          connect_info?: string
          created_at?: string
          game?: string
          host_id?: string
          id?: string
          mode?: string
          notes?: string | null
          region?: string
          skill?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobbies_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      major_events: {
        Row: {
          entrants: number | null
          event_id: string
          game: string
          major_slug: string
          name: string
          online: boolean
          saved_at: string
          startgg_tournament: string | null
          teams: boolean
          top8: Json
        }
        Insert: {
          entrants?: number | null
          event_id: string
          game: string
          major_slug: string
          name: string
          online?: boolean
          saved_at?: string
          startgg_tournament?: string | null
          teams?: boolean
          top8?: Json
        }
        Update: {
          entrants?: number | null
          event_id?: string
          game?: string
          major_slug?: string
          name?: string
          online?: boolean
          saved_at?: string
          startgg_tournament?: string | null
          teams?: boolean
          top8?: Json
        }
        Relationships: [
          {
            foreignKeyName: "major_events_major_slug_fkey"
            columns: ["major_slug"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["slug"]
          },
        ]
      }
      major_set_progress: {
        Row: {
          characters: Json
          claimed_at: string | null
          done_at: string | null
          event_id: string
          major_slug: string
          note: string | null
          sets: number | null
          startgg_event_id: string | null
        }
        Insert: {
          characters?: Json
          claimed_at?: string | null
          done_at?: string | null
          event_id: string
          major_slug: string
          note?: string | null
          sets?: number | null
          startgg_event_id?: string | null
        }
        Update: {
          characters?: Json
          claimed_at?: string | null
          done_at?: string | null
          event_id?: string
          major_slug?: string
          note?: string | null
          sets?: number | null
          startgg_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "major_set_progress_major_slug_event_id_fkey"
            columns: ["major_slug", "event_id"]
            isOneToOne: true
            referencedRelation: "major_events"
            referencedColumns: ["major_slug", "event_id"]
          },
        ]
      }
      major_sets: {
        Row: {
          completed_at: string | null
          event_id: string
          game: string
          major_slug: string
          p1_chars: string[]
          p1_id: string | null
          p1_name: string
          p1_score: number | null
          p2_chars: string[]
          p2_id: string | null
          p2_name: string
          p2_score: number | null
          phase: string | null
          round: string | null
          saved_at: string
          set_id: string
          sort_order: number
          winner: number
        }
        Insert: {
          completed_at?: string | null
          event_id: string
          game: string
          major_slug: string
          p1_chars?: string[]
          p1_id?: string | null
          p1_name: string
          p1_score?: number | null
          p2_chars?: string[]
          p2_id?: string | null
          p2_name: string
          p2_score?: number | null
          phase?: string | null
          round?: string | null
          saved_at?: string
          set_id: string
          sort_order?: number
          winner: number
        }
        Update: {
          completed_at?: string | null
          event_id?: string
          game?: string
          major_slug?: string
          p1_chars?: string[]
          p1_id?: string | null
          p1_name?: string
          p1_score?: number | null
          p2_chars?: string[]
          p2_id?: string | null
          p2_name?: string
          p2_score?: number | null
          phase?: string | null
          round?: string | null
          saved_at?: string
          set_id?: string
          sort_order?: number
          winner?: number
        }
        Relationships: [
          {
            foreignKeyName: "major_sets_major_slug_event_id_fkey"
            columns: ["major_slug", "event_id"]
            isOneToOne: false
            referencedRelation: "major_events"
            referencedColumns: ["major_slug", "event_id"]
          },
        ]
      }
      major_standings: {
        Row: {
          event_id: string
          major_slug: string
          saved_at: string
          standings: Json
          startgg_event_id: string
        }
        Insert: {
          event_id: string
          major_slug: string
          saved_at?: string
          standings?: Json
          startgg_event_id: string
        }
        Update: {
          event_id?: string
          major_slug?: string
          saved_at?: string
          standings?: Json
          startgg_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "major_standings_major_slug_event_id_fkey"
            columns: ["major_slug", "event_id"]
            isOneToOne: true
            referencedRelation: "major_events"
            referencedColumns: ["major_slug", "event_id"]
          },
        ]
      }
      major_suggestions: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          kind: string
          link: string | null
          major_slug: string | null
          note: string | null
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          kind: string
          link?: string | null
          major_slug?: string | null
          note?: string | null
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          kind?: string
          link?: string | null
          major_slug?: string | null
          note?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "major_suggestions_major_slug_fkey"
            columns: ["major_slug"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "major_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      major_vods: {
        Row: {
          added_by: string | null
          created_at: string
          game: string
          id: string
          label: string | null
          major_slug: string
          reviewed_at: string | null
          status: string
          suggested_by: string | null
          url: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          game: string
          id?: string
          label?: string | null
          major_slug: string
          reviewed_at?: string | null
          status?: string
          suggested_by?: string | null
          url: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          game?: string
          id?: string
          label?: string | null
          major_slug?: string
          reviewed_at?: string | null
          status?: string
          suggested_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "major_vods_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "major_vods_major_slug_fkey"
            columns: ["major_slug"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "major_vods_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      majors: {
        Row: {
          added_by: string | null
          city: string | null
          country: string | null
          end_at: string
          entrants: number | null
          games: string[]
          hidden: boolean
          image_url: string | null
          live_notified_at: string | null
          name: string
          results_claimed_at: string | null
          results_saved_at: string | null
          slug: string
          source: string
          source_url: string | null
          standings_claimed_at: string | null
          standings_saved_at: string | null
          start_at: string
          stream_name: string | null
          stream_source: string | null
          suggested_by: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          city?: string | null
          country?: string | null
          end_at: string
          entrants?: number | null
          games?: string[]
          hidden?: boolean
          image_url?: string | null
          live_notified_at?: string | null
          name: string
          results_claimed_at?: string | null
          results_saved_at?: string | null
          slug: string
          source?: string
          source_url?: string | null
          standings_claimed_at?: string | null
          standings_saved_at?: string | null
          start_at: string
          stream_name?: string | null
          stream_source?: string | null
          suggested_by?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          city?: string | null
          country?: string | null
          end_at?: string
          entrants?: number | null
          games?: string[]
          hidden?: boolean
          image_url?: string | null
          live_notified_at?: string | null
          name?: string
          results_claimed_at?: string | null
          results_saved_at?: string | null
          slug?: string
          source?: string
          source_url?: string | null
          standings_claimed_at?: string | null
          standings_saved_at?: string | null
          start_at?: string
          stream_name?: string | null
          stream_source?: string | null
          suggested_by?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "majors_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "majors_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      majors_sync: {
        Row: {
          id: number
          last_run: string
          running_since: string | null
        }
        Insert: {
          id?: number
          last_run?: string
          running_since?: string | null
        }
        Update: {
          id?: number
          last_run?: string
          running_since?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          image_height: number | null
          image_path: string | null
          image_width: number | null
          reply_to_id: string | null
          sender_id: string | null
        }
        Insert: {
          body?: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_height?: number | null
          image_path?: string | null
          image_width?: number | null
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_height?: number | null
          image_path?: string | null
          image_width?: number | null
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string | null
          note: string | null
          post_id: string | null
          reason: string | null
          snapshot: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id?: string | null
          note?: string | null
          post_id?: string | null
          reason?: string | null
          snapshot?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string | null
          note?: string | null
          post_id?: string | null
          reason?: string | null
          snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_words: {
        Row: {
          updated_at: string
          user_id: string
          words: string[]
        }
        Insert: {
          updated_at?: string
          user_id?: string
          words?: string[]
        }
        Update: {
          updated_at?: string
          user_id?: string
          words?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "muted_words_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mutes: {
        Row: {
          created_at: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutes_muted_id_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutes_muter_id_fkey"
            columns: ["muter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          conversation_id: string | null
          created_at: string
          emoji: string | null
          event_href: string | null
          event_name: string | null
          highlight_id: string | null
          id: string
          major_slug: string | null
          post_id: string | null
          read_at: string | null
          reel_submission_id: string | null
          scene_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          emoji?: string | null
          event_href?: string | null
          event_name?: string | null
          highlight_id?: string | null
          id?: string
          major_slug?: string | null
          post_id?: string | null
          read_at?: string | null
          reel_submission_id?: string | null
          scene_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          emoji?: string | null
          event_href?: string | null
          event_name?: string | null
          highlight_id?: string | null
          id?: string
          major_slug?: string | null
          post_id?: string | null
          read_at?: string | null
          reel_submission_id?: string | null
          scene_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "highlights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_major_slug_fkey"
            columns: ["major_slug"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_reel_submission_id_fkey"
            columns: ["reel_submission_id"]
            isOneToOne: false
            referencedRelation: "reel_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pickem_picks: {
        Row: {
          champion: string
          created_at: string
          event_id: number
          event_name: string
          game: string | null
          locks_at: string
          tags: Json
          top8: string[]
          tournament: string
          tournament_slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          champion: string
          created_at?: string
          event_id: number
          event_name: string
          game?: string | null
          locks_at: string
          tags?: Json
          top8: string[]
          tournament: string
          tournament_slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          champion?: string
          created_at?: string
          event_id?: number
          event_name?: string
          game?: string | null
          locks_at?: string
          tags?: Json
          top8?: string[]
          tournament?: string
          tournament_slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickem_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      play_codes: {
        Row: {
          code: string
          game: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          game: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          game?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      play_requests: {
        Row: {
          answered_at: string | null
          created_at: string
          expires_at: string
          from_id: string
          game: string
          id: string
          status: string
          to_id: string
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          expires_at?: string
          from_id: string
          game: string
          id?: string
          status?: string
          to_id: string
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          expires_at?: string
          from_id?: string
          game?: string
          id?: string
          status?: string
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_requests_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_requests_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      play_settings: {
        Row: {
          last_ping_at: string | null
          looking_game: string | null
          looking_until: string | null
          ping_games: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          last_ping_at?: string | null
          looking_game?: string | null
          looking_until?: string | null
          ping_games?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          last_ping_at?: string | null
          looking_game?: string | null
          looking_until?: string | null
          ping_games?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_name_links: {
        Row: {
          added_by: string | null
          created_at: string
          game: string
          name: string
          name_key: string
          player_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          game?: string
          name: string
          name_key: string
          player_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          game?: string
          name?: string
          name_key?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_name_links_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_snapshots: {
        Row: {
          player_id: number
          results: Json
          saved_at: string
          sets: Json
        }
        Insert: {
          player_id: number
          results?: Json
          saved_at?: string
          sets?: Json
        }
        Update: {
          player_id?: number
          results?: Json
          saved_at?: string
          sets?: Json
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          choice: number
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          choice: number
          created_at?: string
          post_id: string
          user_id?: string
        }
        Update: {
          choice?: number
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          closes_at: string
          created_at: string
          options: string[]
          post_id: string
        }
        Insert: {
          closes_at: string
          created_at?: string
          options: string[]
          post_id: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          options?: string[]
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_dismissals: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_dismissals_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_images: {
        Row: {
          alt: string
          attached_at: string | null
          created_at: string
          height: number
          id: string
          path: string
          position: number
          post_id: string | null
          user_id: string | null
          width: number
        }
        Insert: {
          alt?: string
          attached_at?: string | null
          created_at?: string
          height: number
          id?: string
          path: string
          position?: number
          post_id?: string | null
          user_id?: string | null
          width: number
        }
        Update: {
          alt?: string
          attached_at?: string | null
          created_at?: string
          height?: number
          id?: string
          path?: string
          position?: number
          post_id?: string | null
          user_id?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          emoji: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_videos: {
        Row: {
          attached_at: string | null
          created_at: string
          duration_ms: number | null
          height: number | null
          id: string
          path: string | null
          position: number
          post_id: string | null
          poster_path: string | null
          raw_path: string
          status: string
          user_id: string | null
          width: number | null
        }
        Insert: {
          attached_at?: string | null
          created_at?: string
          duration_ms?: number | null
          height?: number | null
          id?: string
          path?: string | null
          position?: number
          post_id?: string | null
          poster_path?: string | null
          raw_path: string
          status?: string
          user_id?: string | null
          width?: number | null
        }
        Update: {
          attached_at?: string | null
          created_at?: string
          duration_ms?: number | null
          height?: number | null
          id?: string
          path?: string | null
          position?: number
          post_id?: string | null
          poster_path?: string | null
          raw_path?: string
          status?: string
          user_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_videos_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          character: string | null
          created_at: string
          edited_at: string | null
          event_name: string | null
          event_start_at: string | null
          flair: string | null
          game: string
          hosted_event_id: string | null
          id: string
          like_count: number
          num_entrants: number | null
          parent_id: string | null
          placement: number | null
          quote_count: number
          quote_of: string | null
          quote_reel_id: string | null
          quote_set_id: string | null
          reaction_count: number
          reel_clip_id: string | null
          removed_at: string | null
          removed_reason: string | null
          reply_count: number
          reply_to: string | null
          repost_count: number
          ruleset_id: string | null
          search_vec: unknown
          set_ref_id: string | null
          spoiler: boolean
          template: string | null
          title: string | null
          tournament_name: string | null
          tournament_slug: string | null
          vs_character: string | null
        }
        Insert: {
          author_id: string
          body: string
          character?: string | null
          created_at?: string
          edited_at?: string | null
          event_name?: string | null
          event_start_at?: string | null
          flair?: string | null
          game?: string
          hosted_event_id?: string | null
          id?: string
          like_count?: number
          num_entrants?: number | null
          parent_id?: string | null
          placement?: number | null
          quote_count?: number
          quote_of?: string | null
          quote_reel_id?: string | null
          quote_set_id?: string | null
          reaction_count?: number
          reel_clip_id?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          reply_count?: number
          reply_to?: string | null
          repost_count?: number
          ruleset_id?: string | null
          search_vec?: unknown
          set_ref_id?: string | null
          spoiler?: boolean
          template?: string | null
          title?: string | null
          tournament_name?: string | null
          tournament_slug?: string | null
          vs_character?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          character?: string | null
          created_at?: string
          edited_at?: string | null
          event_name?: string | null
          event_start_at?: string | null
          flair?: string | null
          game?: string
          hosted_event_id?: string | null
          id?: string
          like_count?: number
          num_entrants?: number | null
          parent_id?: string | null
          placement?: number | null
          quote_count?: number
          quote_of?: string | null
          quote_reel_id?: string | null
          quote_set_id?: string | null
          reaction_count?: number
          reel_clip_id?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          reply_count?: number
          reply_to?: string | null
          repost_count?: number
          ruleset_id?: string | null
          search_vec?: unknown
          set_ref_id?: string | null
          spoiler?: boolean
          template?: string | null
          title?: string | null
          tournament_name?: string | null
          tournament_slug?: string | null
          vs_character?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_hosted_event_id_fkey"
            columns: ["hosted_event_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_quote_of_fkey"
            columns: ["quote_of"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_quote_reel_id_fkey"
            columns: ["quote_reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["clip_id"]
          },
          {
            foreignKeyName: "posts_quote_set_id_fkey"
            columns: ["quote_set_id"]
            isOneToOne: false
            referencedRelation: "set_refs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_reel_clip_id_fkey"
            columns: ["reel_clip_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["clip_id"]
          },
          {
            foreignKeyName: "posts_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_set_ref_id_fkey"
            columns: ["set_ref_id"]
            isOneToOne: false
            referencedRelation: "set_refs"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_names: {
        Row: {
          guest_tag: string | null
          host_id: string
          id: string
          pr_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          guest_tag?: string | null
          host_id: string
          id?: string
          pr_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          guest_tag?: string | null
          host_id?: string
          id?: string
          pr_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pr_names_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pr_names_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      private_profile_data: {
        Row: {
          created_at: string
          date_of_birth: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string
          crew: string | null
          games: string[]
          handle: string
          home_city: string | null
          id: string
          lang: string | null
          lfg_doubles: boolean
          mains: Json
          notification_mutes: string[]
          notify_majors: boolean
          pinned_post_id: string | null
          protected: boolean
          region: string | null
          show_stats: boolean | null
          social_bluesky: string | null
          social_instagram: string | null
          social_reddit: string | null
          social_slippi: string | null
          social_twitch: string | null
          social_x: string | null
          social_youtube: string | null
          tag: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          crew?: string | null
          games?: string[]
          handle: string
          home_city?: string | null
          id: string
          lang?: string | null
          lfg_doubles?: boolean
          mains?: Json
          notification_mutes?: string[]
          notify_majors?: boolean
          pinned_post_id?: string | null
          protected?: boolean
          region?: string | null
          show_stats?: boolean | null
          social_bluesky?: string | null
          social_instagram?: string | null
          social_reddit?: string | null
          social_slippi?: string | null
          social_twitch?: string | null
          social_x?: string | null
          social_youtube?: string | null
          tag: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          crew?: string | null
          games?: string[]
          handle?: string
          home_city?: string | null
          id?: string
          lang?: string | null
          lfg_doubles?: boolean
          mains?: Json
          notification_mutes?: string[]
          notify_majors?: boolean
          pinned_post_id?: string | null
          protected?: boolean
          region?: string | null
          show_stats?: boolean | null
          social_bluesky?: string | null
          social_instagram?: string | null
          social_reddit?: string | null
          social_slippi?: string | null
          social_twitch?: string | null
          social_x?: string | null
          social_youtube?: string | null
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pinned_post_id_fkey"
            columns: ["pinned_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      push_config: {
        Row: {
          endpoint: string
          id: number
          secret: string
        }
        Insert: {
          endpoint: string
          id?: number
          secret: string
        }
        Update: {
          endpoint?: string
          id?: number
          secret?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_channels: {
        Row: {
          approved: boolean
          blocked: boolean
          created_at: string
          default_game: string | null
          display_name: string | null
          login: string
          platform: string
          source: string
          twitch_id: string | null
        }
        Insert: {
          approved?: boolean
          blocked?: boolean
          created_at?: string
          default_game?: string | null
          display_name?: string | null
          login: string
          platform?: string
          source?: string
          twitch_id?: string | null
        }
        Update: {
          approved?: boolean
          blocked?: boolean
          created_at?: string
          default_game?: string | null
          display_name?: string | null
          login?: string
          platform?: string
          source?: string
          twitch_id?: string | null
        }
        Relationships: []
      }
      reel_likes: {
        Row: {
          clip_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          clip_id: string
          created_at?: string
          user_id?: string
        }
        Update: {
          clip_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["clip_id"]
          },
          {
            foreignKeyName: "reel_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_submissions: {
        Row: {
          channel_login: string
          channel_name: string | null
          clip_created_at: string
          clip_id: string
          created_at: string
          duration: number | null
          game: string
          id: string
          platform: string
          reviewed_at: string | null
          status: string
          thumbnail_url: string | null
          title: string
          title_flagged: boolean
          user_id: string
          video_id: string | null
          view_count: number
          vod_offset: number | null
        }
        Insert: {
          channel_login: string
          channel_name?: string | null
          clip_created_at: string
          clip_id: string
          created_at?: string
          duration?: number | null
          game: string
          id?: string
          platform: string
          reviewed_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          title_flagged?: boolean
          user_id: string
          video_id?: string | null
          view_count?: number
          vod_offset?: number | null
        }
        Update: {
          channel_login?: string
          channel_name?: string | null
          clip_created_at?: string
          clip_id?: string
          created_at?: string
          duration?: number | null
          game?: string
          id?: string
          platform?: string
          reviewed_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          title_flagged?: boolean
          user_id?: string
          video_id?: string | null
          view_count?: number
          vod_offset?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          channel_login: string
          channel_name: string | null
          clip_id: string
          created_at: string
          duration: number | null
          fetched_at: string
          game: string
          hidden: boolean
          like_count: number
          low_quality: boolean
          platform: string
          submitted_at: string | null
          submitted_by: string | null
          thumbnail_url: string | null
          title: string
          title_flagged: boolean
          unavailable: boolean
          video_id: string | null
          view_count: number
          vod_offset: number | null
        }
        Insert: {
          channel_login: string
          channel_name?: string | null
          clip_id: string
          created_at: string
          duration?: number | null
          fetched_at?: string
          game: string
          hidden?: boolean
          like_count?: number
          low_quality?: boolean
          platform?: string
          submitted_at?: string | null
          submitted_by?: string | null
          thumbnail_url?: string | null
          title?: string
          title_flagged?: boolean
          unavailable?: boolean
          video_id?: string | null
          view_count?: number
          vod_offset?: number | null
        }
        Update: {
          channel_login?: string
          channel_name?: string | null
          clip_id?: string
          created_at?: string
          duration?: number | null
          fetched_at?: string
          game?: string
          hidden?: boolean
          like_count?: number
          low_quality?: boolean
          platform?: string
          submitted_at?: string | null
          submitted_by?: string | null
          thumbnail_url?: string | null
          title?: string
          title_flagged?: boolean
          unavailable?: boolean
          video_id?: string | null
          view_count?: number
          vod_offset?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reels_channel_login_fkey"
            columns: ["channel_login"]
            isOneToOne: false
            referencedRelation: "reel_channels"
            referencedColumns: ["login"]
          },
          {
            foreignKeyName: "reels_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reels_sync: {
        Row: {
          id: number
          last_run: string
          running_since: string | null
        }
        Insert: {
          id?: number
          last_run?: string
          running_since?: string | null
        }
        Update: {
          id?: number
          last_run?: string
          running_since?: string | null
        }
        Relationships: []
      }
      region_events: {
        Row: {
          data: Json | null
          last_run: string
          region: string
          running_since: string | null
          saved_at: string | null
        }
        Insert: {
          data?: Json | null
          last_run?: string
          region: string
          running_since?: string | null
          saved_at?: string | null
        }
        Update: {
          data?: Json | null
          last_run?: string
          region?: string
          running_since?: string | null
          saved_at?: string | null
        }
        Relationships: []
      }
      replay_stats: {
        Row: {
          games: number
          saved_at: string
          shown: boolean
          summary: Json
          user_id: string
        }
        Insert: {
          games: number
          saved_at?: string
          shown?: boolean
          summary: Json
          user_id: string
        }
        Update: {
          games?: number
          saved_at?: string
          shown?: boolean
          summary?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reposts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ruleset_versions: {
        Row: {
          changelog: string | null
          id: string
          notes: string | null
          published_at: string
          published_by: string | null
          rules: Json
          ruleset_id: string
          version: number
        }
        Insert: {
          changelog?: string | null
          id?: string
          notes?: string | null
          published_at?: string
          published_by?: string | null
          rules?: Json
          ruleset_id: string
          version: number
        }
        Update: {
          changelog?: string | null
          id?: string
          notes?: string | null
          published_at?: string
          published_by?: string | null
          rules?: Json
          ruleset_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ruleset_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ruleset_versions_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["id"]
          },
        ]
      }
      rulesets: {
        Row: {
          created_at: string
          created_by: string | null
          game: string
          id: string
          name: string
          scene_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          game: string
          id?: string
          name: string
          scene_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          game?: string
          id?: string
          name?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rulesets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rulesets_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_clips: {
        Row: {
          clip_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          clip_id: string
          created_at?: string
          user_id?: string
        }
        Update: {
          clip_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_clips_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["clip_id"]
          },
          {
            foreignKeyName: "saved_clips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_admins: {
        Row: {
          created_at: string
          message: string | null
          scene_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message?: string | null
          scene_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          message?: string | null
          scene_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_admins_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_emojis: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_path: string
          name: string
          scene_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_path: string
          name: string
          scene_id: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string
          name?: string
          scene_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_emojis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_emojis_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_members: {
        Row: {
          joined_at: string
          scene_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          scene_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          scene_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_members_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          cities: string[]
          created_at: string
          description: string | null
          games: string[]
          id: string
          links: Json
          name: string
          region: string
          requested_by: string | null
          slug: string
          status: string
        }
        Insert: {
          cities?: string[]
          created_at?: string
          description?: string | null
          games?: string[]
          id?: string
          links?: Json
          name: string
          region?: string
          requested_by?: string | null
          slug: string
          status?: string
        }
        Update: {
          cities?: string[]
          created_at?: string
          description?: string | null
          games?: string[]
          id?: string
          links?: Json
          name?: string
          region?: string
          requested_by?: string | null
          slug?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      season_admins: {
        Row: {
          accepted_at: string | null
          added_by: string | null
          created_at: string
          season_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          added_by?: string | null
          created_at?: string
          season_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          added_by?: string | null
          created_at?: string
          season_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_admins_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_admins_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      season_events: {
        Row: {
          added_at: string
          added_by: string | null
          entrants: number | null
          held_on: string
          id: string
          name: string
          ref: string
          results: Json
          season_id: string
          source: string
          weight: number
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          entrants?: number | null
          held_on: string
          id?: string
          name: string
          ref: string
          results: Json
          season_id: string
          source: string
          weight?: number
        }
        Update: {
          added_at?: string
          added_by?: string | null
          entrants?: number | null
          held_on?: string
          id?: string
          name?: string
          ref?: string
          results?: Json
          season_id?: string
          source?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_events_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_players: {
        Row: {
          display_name: string | null
          left_out: boolean
          merged_into: string | null
          player_key: string
          season_id: string
          updated_at: string
        }
        Insert: {
          display_name?: string | null
          left_out?: boolean
          merged_into?: string | null
          player_key: string
          season_id: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          left_out?: boolean
          merged_into?: string | null
          player_key?: string
          season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_players_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          best_of: number | null
          created_at: string
          ends_on: string
          game: string
          id: string
          min_events: number
          name: string
          owner_id: string
          points: Json
          region: string | null
          removed_at: string | null
          starts_on: string
          updated_at: string
          visibility: string
        }
        Insert: {
          best_of?: number | null
          created_at?: string
          ends_on: string
          game: string
          id?: string
          min_events?: number
          name: string
          owner_id: string
          points: Json
          region?: string | null
          removed_at?: string | null
          starts_on: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          best_of?: number | null
          created_at?: string
          ends_on?: string
          game?: string
          id?: string
          min_events?: number
          name?: string
          owner_id?: string
          points?: Json
          region?: string | null
          removed_at?: string | null
          starts_on?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      set_refs: {
        Row: {
          event_name: string | null
          external_id: string
          game: string | null
          id: string
          p1_name: string | null
          p1_score: number | null
          p2_name: string | null
          p2_score: number | null
          round_label: string | null
          source: string
          tournament_name: string | null
          updated_at: string
          winner: number | null
        }
        Insert: {
          event_name?: string | null
          external_id: string
          game?: string | null
          id?: string
          p1_name?: string | null
          p1_score?: number | null
          p2_name?: string | null
          p2_score?: number | null
          round_label?: string | null
          source: string
          tournament_name?: string | null
          updated_at?: string
          winner?: number | null
        }
        Update: {
          event_name?: string | null
          external_id?: string
          game?: string | null
          id?: string
          p1_name?: string | null
          p1_score?: number | null
          p2_name?: string | null
          p2_score?: number | null
          round_label?: string | null
          source?: string
          tournament_name?: string | null
          updated_at?: string
          winner?: number | null
        }
        Relationships: []
      }
      set_vods: {
        Row: {
          added_by: string
          created_at: string
          game: string | null
          hosted_event_id: string | null
          id: string
          p1_player: string | null
          p1_tag: string | null
          p2_player: string | null
          p2_tag: string | null
          played_at: string | null
          round: string | null
          set_id: string
          source: string
          tournament: string | null
          url: string
        }
        Insert: {
          added_by: string
          created_at?: string
          game?: string | null
          hosted_event_id?: string | null
          id?: string
          p1_player?: string | null
          p1_tag?: string | null
          p2_player?: string | null
          p2_tag?: string | null
          played_at?: string | null
          round?: string | null
          set_id: string
          source: string
          tournament?: string | null
          url: string
        }
        Update: {
          added_by?: string
          created_at?: string
          game?: string | null
          hosted_event_id?: string | null
          id?: string
          p1_player?: string | null
          p1_tag?: string | null
          p2_player?: string | null
          p2_tag?: string | null
          played_at?: string | null
          round?: string | null
          set_id?: string
          source?: string
          tournament?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_vods_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_vods_hosted_event_id_fkey"
            columns: ["hosted_event_id"]
            isOneToOne: false
            referencedRelation: "hosted_events"
            referencedColumns: ["id"]
          },
        ]
      }
      site_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      startgg_links: {
        Row: {
          gamer_tag: string | null
          linked_at: string
          startgg_player_id: number
          startgg_slug: string | null
          startgg_user_id: number
          user_id: string
        }
        Insert: {
          gamer_tag?: string | null
          linked_at?: string
          startgg_player_id: number
          startgg_slug?: string | null
          startgg_user_id: number
          user_id: string
        }
        Update: {
          gamer_tag?: string | null
          linked_at?: string
          startgg_player_id?: number
          startgg_slug?: string | null
          startgg_user_id?: number
          user_id?: string
        }
        Relationships: []
      }
      startgg_players: {
        Row: {
          first_seen_at: string
          hidden: boolean
          last_seen_at: string
          player_id: number
          prefix: string | null
          tag: string
        }
        Insert: {
          first_seen_at?: string
          hidden?: boolean
          last_seen_at?: string
          player_id: number
          prefix?: string | null
          tag: string
        }
        Update: {
          first_seen_at?: string
          hidden?: boolean
          last_seen_at?: string
          player_id?: number
          prefix?: string | null
          tag?: string
        }
        Relationships: []
      }
      suspended_accounts: {
        Row: {
          suspended_at: string
          user_id: string
        }
        Insert: {
          suspended_at?: string
          user_id: string
        }
        Update: {
          suspended_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      feed_items: {
        Row: {
          actor_id: string | null
          at: string | null
          game: string | null
          kind: string | null
          post_id: string | null
          reel_clip_id: string | null
          ruleset_id: string | null
          set_ref_id: string | null
        }
        Relationships: []
      }
      following_feed_items: {
        Row: {
          actor_id: string | null
          at: string | null
          game: string | null
          kind: string | null
          post_id: string | null
          reel_clip_id: string | null
          ruleset_id: string | null
          set_ref_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_message_request: { Args: { conv: string }; Returns: undefined }
      add_group_members: {
        Args: { conv: string; people: string[] }
        Returns: undefined
      }
      admin_usage: { Args: never; Returns: Json }
      answer_play_request: {
        Args: { p_accept: boolean; p_id: string }
        Returns: string
      }
      ask_to_play: { Args: { p_game: string; p_to: string }; Returns: string }
      cancel_play_request: { Args: { p_id: string }; Returns: undefined }
      check_in_hosted_event: { Args: { ev: string }; Returns: undefined }
      check_in_hosted_team: { Args: { ev: string }; Returns: undefined }
      claim_major_results: {
        Args: { max_count: number; slugs: string[] }
        Returns: string[]
      }
      claim_major_set_event: {
        Args: { event: string; slug: string }
        Returns: boolean
      }
      claim_major_standings: {
        Args: { max_count: number; slugs: string[] }
        Returns: string[]
      }
      claim_refresh: {
        Args: { every_minutes: number; job: string }
        Returns: boolean
      }
      conversation_allows_photos: { Args: { conv: string }; Returns: boolean }
      conversation_can_send: { Args: { conv: string }; Returns: boolean }
      create_group: {
        Args: { people: string[]; title: string }
        Returns: string
      }
      edit_post: {
        Args: { new_body: string; post: string }
        Returns: undefined
      }
      empty_conversations: { Args: never; Returns: string[] }
      event_going: {
        Args: { kind: string; ref: string }
        Returns: {
          friends: Json
          interested: number
          total: number
        }[]
      }
      finish_refresh: { Args: { job: string; ok: boolean }; Returns: undefined }
      for_you_feed: {
        Args: {
          p_as_of?: string
          p_game?: string
          p_limit?: number
          p_offset?: number
          p_region?: string
        }
        Returns: {
          post_id: string
          reason: string
          reason_detail: string
          score: number
        }[]
      }
      host_add_cohost: {
        Args: { ev: string; person: string }
        Returns: undefined
      }
      host_add_guest: {
        Args: { ev: string; guest_tag: string }
        Returns: string
      }
      host_add_team: {
        Args: { ev: string; name1: string; name2: string }
        Returns: string
      }
      host_check_in: {
        Args: { ev: string; person: string }
        Returns: undefined
      }
      host_remove_cohost: {
        Args: { ev: string; person: string }
        Returns: undefined
      }
      host_remove_entrant: {
        Args: { ev: string; person: string }
        Returns: undefined
      }
      host_set_seeds: {
        Args: { ev: string; ordered: string[] }
        Returns: undefined
      }
      join_hosted_event: { Args: { ev: string }; Returns: undefined }
      join_hosted_team: {
        Args: { ev: string; partner: string; partner_name: string }
        Returns: string
      }
      join_hosted_waitlist: { Args: { ev: string }; Returns: undefined }
      join_league: { Args: { lg: string }; Returns: undefined }
      ladder_answer: {
        Args: { p_agree: boolean; p_match: string }
        Returns: undefined
      }
      ladder_cancel: { Args: { p_match: string }; Returns: undefined }
      ladder_find_match: {
        Args: { p_connect: string; p_game: string }
        Returns: string
      }
      ladder_leave_queue: { Args: never; Returns: undefined }
      ladder_report: {
        Args: { p_match: string; p_mine: number; p_theirs: number }
        Returns: undefined
      }
      league_remove_player: {
        Args: { lg: string; person: string }
        Returns: undefined
      }
      leave_conversation: { Args: { conv: string }; Returns: undefined }
      leave_hosted_event: { Args: { ev: string }; Returns: undefined }
      leave_hosted_team: { Args: { ev: string }; Returns: undefined }
      leave_hosted_waitlist: { Args: { ev: string }; Returns: undefined }
      leave_league: { Args: { lg: string }; Returns: undefined }
      limit_action: { Args: { action: string }; Returns: undefined }
      limit_message_photo: { Args: never; Returns: undefined }
      log_error: {
        Args: {
          p_digest: string
          p_fingerprint: string
          p_message: string
          p_path: string
          p_source: string
        }
        Returns: undefined
      }
      mark_conversation_read: { Args: { conv: string }; Returns: undefined }
      messageable_people: {
        Args: { q?: string }
        Returns: {
          handle: string
          id: string
          mutual: boolean
          tag: string
        }[]
      }
      my_conversations: {
        Args: never
        Returns: {
          can_send: boolean
          id: string
          kind: string
          last_body: string
          last_deleted: boolean
          last_has_image: boolean
          last_message_at: string
          last_sender: string
          members: Json
          muted: boolean
          status: string
          title: string
          unread: number
        }[]
      }
      needs_invite: { Args: never; Returns: boolean }
      play_friends: {
        Args: never
        Returns: {
          avatar_path: string
          handle: string
          id: string
          looking_game: string
          looking_until: string
          tag: string
        }[]
      }
      play_request_codes: {
        Args: { p_id: string }
        Returns: {
          from_code: string
          to_code: string
        }[]
      }
      poll_results: {
        Args: { posts: string[] }
        Returns: {
          choice: number
          post_id: string
          votes: number
        }[]
      }
      redeem_invite: { Args: { p_code: string }; Returns: undefined }
      reels_page: {
        Args: {
          p_games: string[]
          p_limit?: number
          p_offset?: number
          p_seen?: string[]
        }
        Returns: {
          channel_login: string
          channel_name: string | null
          clip_id: string
          created_at: string
          duration: number | null
          fetched_at: string
          game: string
          hidden: boolean
          like_count: number
          low_quality: boolean
          platform: string
          submitted_at: string | null
          submitted_by: string | null
          thumbnail_url: string | null
          title: string
          title_flagged: boolean
          unavailable: boolean
          video_id: string | null
          view_count: number
          vod_offset: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "reels"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      remove_group_member: {
        Args: { conv: string; person: string }
        Returns: undefined
      }
      rename_group: {
        Args: { conv: string; new_title: string }
        Returns: undefined
      }
      report_league_set: {
        Args: { mine: number; s: string; theirs: number }
        Returns: string
      }
      set_conversation_muted: {
        Args: { conv: string; mute: boolean }
        Returns: undefined
      }
      start_direct: { Args: { other: string }; Returns: string }
      take_daily_allowance: {
        Args: { p_max: number; p_what: string }
        Returns: boolean
      }
      take_startgg_slot: { Args: { per_minute: number }; Returns: number }
      take_startgg_slots: {
        Args: { per_minute: number; want: number }
        Returns: Record<string, unknown>
      }
      unread_conversations: { Args: never; Returns: number }
      user_by_discord: { Args: { discord_user_id: string }; Returns: string }
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
