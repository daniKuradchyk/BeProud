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
      achievements: {
        Row: {
          category: string
          description: string
          icon: string
          id: number
          slug: string
          tier: number
          title: string
        }
        Insert: {
          category: string
          description: string
          icon: string
          id: number
          slug: string
          tier: number
          title: string
        }
        Update: {
          category?: string
          description?: string
          icon?: string
          id?: number
          slug?: string
          tier?: number
          title?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
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
        Relationships: []
      }
      comments: {
        Row: {
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_for_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          common_mistakes: string[]
          contraindications: string[]
          created_at: string
          description: string | null
          difficulty: number
          equipment: string[]
          evidence_level: string | null
          force: string | null
          gif_url: string | null
          id: string
          image_url: string | null
          instructions: string
          mechanic: string
          muscle_groups_primary: string[]
          muscle_groups_secondary: string[]
          name: string
          references_text: string | null
          slug: string
        }
        Insert: {
          common_mistakes?: string[]
          contraindications?: string[]
          created_at?: string
          description?: string | null
          difficulty: number
          equipment?: string[]
          evidence_level?: string | null
          force?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          instructions: string
          mechanic: string
          muscle_groups_primary?: string[]
          muscle_groups_secondary?: string[]
          name: string
          references_text?: string | null
          slug: string
        }
        Update: {
          common_mistakes?: string[]
          contraindications?: string[]
          created_at?: string
          description?: string | null
          difficulty?: number
          equipment?: string[]
          evidence_level?: string | null
          force?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          instructions?: string
          mechanic?: string
          muscle_groups_primary?: string[]
          muscle_groups_secondary?: string[]
          name?: string
          references_text?: string | null
          slug?: string
        }
        Relationships: []
      }
      fasting_logs: {
        Row: {
          actual_duration_min: number
          created_at: string
          ended_at: string
          id: string
          notes: string | null
          planned_duration_min: number
          protocol: Database["public"]["Enums"]["fasting_protocol"]
          started_at: string
          status: Database["public"]["Enums"]["fasting_status"]
          user_id: string
        }
        Insert: {
          actual_duration_min: number
          created_at?: string
          ended_at: string
          id?: string
          notes?: string | null
          planned_duration_min: number
          protocol: Database["public"]["Enums"]["fasting_protocol"]
          started_at: string
          status: Database["public"]["Enums"]["fasting_status"]
          user_id: string
        }
        Update: {
          actual_duration_min?: number
          created_at?: string
          ended_at?: string
          id?: string
          notes?: string | null
          planned_duration_min?: number
          protocol?: Database["public"]["Enums"]["fasting_protocol"]
          started_at?: string
          status?: Database["public"]["Enums"]["fasting_status"]
          user_id?: string
        }
        Relationships: []
      }
      fasting_protocols: {
        Row: {
          created_at: string
          eat_end: string | null
          eat_start: string | null
          enabled: boolean
          low_cal_days: string[] | null
          notify_before_close: boolean
          notify_on_complete: boolean
          protocol: Database["public"]["Enums"]["fasting_protocol"]
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eat_end?: string | null
          eat_start?: string | null
          enabled?: boolean
          low_cal_days?: string[] | null
          notify_before_close?: boolean
          notify_on_complete?: boolean
          protocol: Database["public"]["Enums"]["fasting_protocol"]
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          eat_end?: string | null
          eat_start?: string | null
          enabled?: boolean
          low_cal_days?: string[] | null
          notify_before_close?: boolean
          notify_on_complete?: boolean
          protocol?: Database["public"]["Enums"]["fasting_protocol"]
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          accepted_at: string | null
          created_at: string
          followed_id: string
          follower_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          followed_id: string
          follower_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          followed_id?: string
          follower_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followed_id_profiles_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_profiles_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          brand: string | null
          carbs_per_100g: number
          created_at: string
          created_by: string | null
          external_id: string | null
          fat_per_100g: number
          fiber_per_100g: number | null
          id: string
          image_url: string | null
          kcal_per_100g: number
          name: string
          protein_per_100g: number
          serving_size_g: number | null
          source: string
          sugars_per_100g: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          carbs_per_100g?: number
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          fat_per_100g?: number
          fiber_per_100g?: number | null
          id?: string
          image_url?: string | null
          kcal_per_100g: number
          name: string
          protein_per_100g?: number
          serving_size_g?: number | null
          source: string
          sugars_per_100g?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          carbs_per_100g?: number
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          fat_per_100g?: number
          fiber_per_100g?: number | null
          id?: string
          image_url?: string | null
          kcal_per_100g?: number
          name?: string
          protein_per_100g?: number
          serving_size_g?: number | null
          source?: string
          sugars_per_100g?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          horizon: string
          id: string
          target_points: number | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          horizon?: string
          id?: string
          target_points?: number | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          horizon?: string
          id?: string
          target_points?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          invite_code: string
          is_private: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_code: string
          is_private?: boolean
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          is_private?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      gym_routine_days: {
        Row: {
          day_index: number
          gym_routine_id: string
          id: string
          name: string
        }
        Insert: {
          day_index: number
          gym_routine_id: string
          id?: string
          name: string
        }
        Update: {
          day_index?: number
          gym_routine_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_routine_days_gym_routine_id_fkey"
            columns: ["gym_routine_id"]
            isOneToOne: false
            referencedRelation: "gym_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_routine_exercises: {
        Row: {
          exercise_id: string
          gym_routine_day_id: string
          id: string
          notes: string | null
          position: number
          reps_max: number
          reps_min: number
          rest_seconds: number
          sets: number
        }
        Insert: {
          exercise_id: string
          gym_routine_day_id: string
          id?: string
          notes?: string | null
          position: number
          reps_max: number
          reps_min: number
          rest_seconds?: number
          sets: number
        }
        Update: {
          exercise_id?: string
          gym_routine_day_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps_max?: number
          reps_min?: number
          rest_seconds?: number
          sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_routine_exercises_gym_routine_day_id_fkey"
            columns: ["gym_routine_day_id"]
            isOneToOne: false
            referencedRelation: "gym_routine_days"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_routines: {
        Row: {
          created_at: string
          days_per_week: number
          id: string
          is_active: boolean
          name: string
          template: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          days_per_week: number
          id?: string
          is_active?: boolean
          name: string
          template?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          days_per_week?: number
          id?: string
          is_active?: boolean
          name?: string
          template?: string | null
          user_id?: string
        }
        Relationships: []
      }
      leagues: {
        Row: {
          color: string
          icon: string
          id: number
          max_points_week: number | null
          min_points_week: number
          name: string
          slug: string
          tier: number
        }
        Insert: {
          color: string
          icon: string
          id: number
          max_points_week?: number | null
          min_points_week: number
          name: string
          slug: string
          tier: number
        }
        Update: {
          color?: string
          icon?: string
          id?: number
          max_points_week?: number | null
          min_points_week?: number
          name?: string
          slug?: string
          tier?: number
        }
        Relationships: []
      }
      likes: {
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
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_for_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_log_items: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          food_item_id: string
          id: string
          kcal: number
          meal_log_id: string
          protein_g: number
          quantity_g: number
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_item_id: string
          id?: string
          kcal: number
          meal_log_id: string
          protein_g?: number
          quantity_g: number
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_item_id?: string
          id?: string
          kcal?: number
          meal_log_id?: string
          protein_g?: number
          quantity_g?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_log_items_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_items_meal_log_id_fkey"
            columns: ["meal_log_id"]
            isOneToOne: false
            referencedRelation: "meal_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          created_at: string
          eaten_at: string
          id: string
          log_date: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          eaten_at?: string
          id?: string
          log_date?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          eaten_at?: string
          id?: string
          log_date?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          media_url: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          media_url?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          media_url?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          push_error: string | null
          read_at: string | null
          sent_push_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          push_error?: string | null
          read_at?: string | null
          sent_push_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          push_error?: string | null
          read_at?: string | null
          sent_push_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_targets: {
        Row: {
          computed_at: string
          daily_carbs_g: number
          daily_fat_g: number
          daily_kcal: number
          daily_protein_g: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          computed_at?: string
          daily_carbs_g: number
          daily_fat_g: number
          daily_kcal: number
          daily_protein_g: number
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          computed_at?: string
          daily_carbs_g?: number
          daily_fat_g?: number
          daily_kcal?: number
          daily_protein_g?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          caption: string | null
          comments_count: number
          completion_id: string
          created_at: string
          id: string
          likes_count: number
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number
          completion_id: string
          created_at?: string
          id?: string
          likes_count?: number
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number
          completion_id?: string
          created_at?: string
          id?: string
          likes_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: true
            referencedRelation: "task_completions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          biological_sex: string | null
          birth_date: string | null
          created_at: string
          daily_minutes: number | null
          deleted_at: string | null
          display_name: string
          equipment: string[]
          height_cm: number | null
          id: string
          is_private: boolean
          level: number
          notification_prefs: Json
          primary_goal: string | null
          restrictions: string[]
          streak_best: number
          streak_current: number
          timezone: string
          total_points: number
          updated_at: string
          username: string
          weekly_days: number | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          biological_sex?: string | null
          birth_date?: string | null
          created_at?: string
          daily_minutes?: number | null
          deleted_at?: string | null
          display_name: string
          equipment?: string[]
          height_cm?: number | null
          id: string
          is_private?: boolean
          level?: number
          notification_prefs?: Json
          primary_goal?: string | null
          restrictions?: string[]
          streak_best?: number
          streak_current?: number
          timezone?: string
          total_points?: number
          updated_at?: string
          username: string
          weekly_days?: number | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          biological_sex?: string | null
          birth_date?: string | null
          created_at?: string
          daily_minutes?: number | null
          deleted_at?: string | null
          display_name?: string
          equipment?: string[]
          height_cm?: number | null
          id?: string
          is_private?: boolean
          level?: number
          notification_prefs?: Json
          primary_goal?: string | null
          restrictions?: string[]
          streak_best?: number
          streak_current?: number
          timezone?: string
          total_points?: number
          updated_at?: string
          username?: string
          weekly_days?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      routine_tasks: {
        Row: {
          created_at: string
          id: string
          points_override: number | null
          position: number
          routine_id: string
          target_frequency: string
          task_id: string | null
          time_slot: string
          user_task_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          points_override?: number | null
          position?: number
          routine_id: string
          target_frequency?: string
          task_id?: string | null
          time_slot?: string
          user_task_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          points_override?: number | null
          position?: number
          routine_id?: string
          target_frequency?: string
          task_id?: string | null
          time_slot?: string
          user_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_tasks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_tasks_user_task_id_fkey"
            columns: ["user_task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          answers: Json | null
          created_at: string
          ends_at: string | null
          horizon: string
          id: string
          is_active: boolean
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          ends_at?: string | null
          horizon?: string
          id?: string
          is_active?: boolean
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          ends_at?: string | null
          horizon?: string
          id?: string
          is_active?: boolean
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          break_minutes: number
          created_at: string
          cycles_completed: number
          cycles_planned: number
          ended_at: string | null
          focus_minutes: number
          id: string
          notes: string | null
          planned_minutes: number
          routine_task_id: string | null
          started_at: string
          status: string
          technique: string
          user_id: string
        }
        Insert: {
          break_minutes: number
          created_at?: string
          cycles_completed?: number
          cycles_planned: number
          ended_at?: string | null
          focus_minutes: number
          id?: string
          notes?: string | null
          planned_minutes: number
          routine_task_id?: string | null
          started_at?: string
          status?: string
          technique?: string
          user_id: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          cycles_completed?: number
          cycles_planned?: number
          ended_at?: string | null
          focus_minutes?: number
          id?: string
          notes?: string | null
          planned_minutes?: number
          routine_task_id?: string | null
          started_at?: string
          status?: string
          technique?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_routine_task_id_fkey"
            columns: ["routine_task_id"]
            isOneToOne: false
            referencedRelation: "routine_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_routine_task_id_fkey"
            columns: ["routine_task_id"]
            isOneToOne: false
            referencedRelation: "routine_tasks_resolved"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          ai_confidence: number | null
          ai_reason: string | null
          ai_validation_status: string
          created_at: string
          id: string
          is_public: boolean
          photo_path: string | null
          points_awarded: number
          routine_task_id: string | null
          task_id: string | null
          user_id: string
          user_task_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_reason?: string | null
          ai_validation_status?: string
          created_at?: string
          id?: string
          is_public?: boolean
          photo_path?: string | null
          points_awarded?: number
          routine_task_id?: string | null
          task_id?: string | null
          user_id: string
          user_task_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_reason?: string | null
          ai_validation_status?: string
          created_at?: string
          id?: string
          is_public?: boolean
          photo_path?: string | null
          points_awarded?: number
          routine_task_id?: string | null
          task_id?: string | null
          user_id?: string
          user_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_routine_task_id_fkey"
            columns: ["routine_task_id"]
            isOneToOne: false
            referencedRelation: "routine_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_routine_task_id_fkey"
            columns: ["routine_task_id"]
            isOneToOne: false
            referencedRelation: "routine_tasks_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_user_task_id_fkey"
            columns: ["user_task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks_catalog: {
        Row: {
          base_points: number
          calories_burned: number | null
          category: string
          contraindications: string[]
          created_at: string
          description: string
          difficulty: number | null
          duration_min: number | null
          equipment_required: string[]
          evidence_level: string | null
          icon: string | null
          id: string
          is_active: boolean
          module: string
          muscle_groups: string[]
          photo_hint: string
          references_text: string | null
          slug: string
          subcategory: string | null
          title: string
        }
        Insert: {
          base_points: number
          calories_burned?: number | null
          category: string
          contraindications?: string[]
          created_at?: string
          description: string
          difficulty?: number | null
          duration_min?: number | null
          equipment_required?: string[]
          evidence_level?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          module?: string
          muscle_groups?: string[]
          photo_hint: string
          references_text?: string | null
          slug: string
          subcategory?: string | null
          title: string
        }
        Update: {
          base_points?: number
          calories_burned?: number | null
          category?: string
          contraindications?: string[]
          created_at?: string
          description?: string
          difficulty?: number | null
          duration_min?: number | null
          equipment_required?: string[]
          evidence_level?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          module?: string
          muscle_groups?: string[]
          photo_hint?: string
          references_text?: string | null
          slug?: string
          subcategory?: string | null
          title?: string
        }
        Relationships: []
      }
      thread_members: {
        Row: {
          joined_at: string
          last_read_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_read_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          last_read_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          last_message_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          last_message_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          last_message_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tasks: {
        Row: {
          base_points: number
          category: string
          created_at: string
          description: string | null
          difficulty: number
          icon: string | null
          id: string
          module: string
          source: string
          title: string
          user_id: string
        }
        Insert: {
          base_points?: number
          category: string
          created_at?: string
          description?: string | null
          difficulty?: number
          icon?: string | null
          id?: string
          module?: string
          source?: string
          title: string
          user_id: string
        }
        Update: {
          base_points?: number
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: number
          icon?: string | null
          id?: string
          module?: string
          source?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_leaderboards: {
        Row: {
          group_id: string | null
          league_id: number | null
          points: number
          rank: number
          updated_at: string
          user_id: string
          week: string
        }
        Insert: {
          group_id?: string | null
          league_id?: number | null
          points?: number
          rank?: number
          updated_at?: string
          user_id: string
          week: string
        }
        Update: {
          group_id?: string | null
          league_id?: number | null
          points?: number
          rank?: number
          updated_at?: string
          user_id?: string
          week?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_leaderboards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_leaderboards_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          ended_at: string | null
          gym_routine_day_id: string | null
          id: string
          notes: string | null
          started_at: string
          total_volume: number
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          gym_routine_day_id?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          total_volume?: number
          user_id: string
        }
        Update: {
          ended_at?: string | null
          gym_routine_day_id?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          total_volume?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_gym_routine_day_id_fkey"
            columns: ["gym_routine_day_id"]
            isOneToOne: false
            referencedRelation: "gym_routine_days"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          completed_at: string
          exercise_id: string
          id: string
          reps: number
          rpe: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg: number
        }
        Insert: {
          completed_at?: string
          exercise_id: string
          id?: string
          reps: number
          rpe?: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg?: number
        }
        Update: {
          completed_at?: string
          exercise_id?: string
          id?: string
          reps?: number
          rpe?: number | null
          session_id?: string
          set_index?: number
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      feed_for_user: {
        Row: {
          avatar_url: string | null
          caption: string | null
          comments_count: number | null
          completion_id: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_private: boolean | null
          likes_count: number | null
          photo_path: string | null
          points_awarded: number | null
          task_category: string | null
          task_icon: string | null
          task_title: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: true
            referencedRelation: "task_completions"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_tasks_resolved: {
        Row: {
          base_points: number | null
          category: string | null
          created_at: string | null
          description: string | null
          difficulty: number | null
          icon: string | null
          id: string | null
          module: string | null
          points_override: number | null
          position: number | null
          routine_id: string | null
          slug: string | null
          target_frequency: string | null
          task_id: string | null
          task_source: string | null
          time_slot: string | null
          title: string | null
          user_task_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_tasks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_tasks_user_task_id_fkey"
            columns: ["user_task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _gym_pick_exercise: {
        Args: { p_slugs: string[]; p_user_equipment_full: string[] }
        Returns: string
      }
      add_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: Json
      }
      apply_wizard_proposal: {
        Args: { p_proposals: Json; p_slot: string }
        Returns: number
      }
      calculate_bmr: {
        Args: { age: number; height_cm: number; sex: string; weight_kg: number }
        Returns: number
      }
      calculate_level: { Args: { p_points: number }; Returns: number }
      calculate_tdee: {
        Args: { bmr: number; daily_minutes: number; weekly_days: number }
        Returns: number
      }
      close_completed_fasts: { Args: never; Returns: number }
      complete_study_cycle: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      compute_nutrition_targets: {
        Args: { p_force?: boolean }
        Returns: {
          computed_at: string
          daily_carbs_g: number
          daily_fat_g: number
          daily_kcal: number
          daily_protein_g: number
          source: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "nutrition_targets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      count_pending_follow_requests: { Args: never; Returns: number }
      count_unread_threads: { Args: never; Returns: number }
      create_group: {
        Args: {
          p_cover_url: string
          p_description: string
          p_is_private: boolean
          p_name: string
        }
        Returns: string
      }
      create_gym_routine_from_template: {
        Args: {
          p_day_indices: number[]
          p_days_per_week: number
          p_template: string
        }
        Returns: string
      }
      current_streak: { Args: { p_user_id: string }; Returns: number }
      daily_recommendations: { Args: { p_user_id: string }; Returns: Json }
      delete_user_account: { Args: never; Returns: undefined }
      estimate_1rm: {
        Args: { p_exercise_id: string; p_user_id: string }
        Returns: number
      }
      export_my_data: { Args: never; Returns: Json }
      find_group_by_code: {
        Args: { p_code: string }
        Returns: {
          cover_url: string
          description: string
          id: string
          is_private: boolean
          member_count: number
          name: string
          owner_username: string
        }[]
      }
      finish_study_session: {
        Args: { p_notes?: string; p_session_id: string; p_status: string }
        Returns: undefined
      }
      generate_routine: { Args: { answers: Json }; Returns: string }
      get_or_create_dm: { Args: { p_other_user_id: string }; Returns: string }
      group_leaderboard: {
        Args: { p_group_id: string; p_period: string }
        Returns: {
          avatar_url: string
          display_name: string
          points: number
          rank: number
          user_id: string
          username: string
        }[]
      }
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      is_thread_member: { Args: { p_thread_id: string }; Returns: boolean }
      join_group_by_code: { Args: { p_code: string }; Returns: Json }
      mark_thread_read: { Args: { p_thread_id: string }; Returns: undefined }
      notif_pref_enabled: {
        Args: { p_type: string; p_user_id: string }
        Returns: boolean
      }
      profile_needs_onboarding: { Args: { p_id: string }; Returns: boolean }
      purge_deleted_accounts: { Args: never; Returns: number }
      refresh_weekly_leaderboards: { Args: never; Returns: undefined }
      reorder_routine_tasks: {
        Args: { p_ids: string[]; p_routine_id: string }
        Returns: undefined
      }
      respond_follow_request: {
        Args: { p_accept: boolean; p_follower_id: string }
        Returns: undefined
      }
      search_profiles: {
        Args: { q: string }
        Returns: {
          avatar_url: string
          display_name: string
          follow_status: string
          id: string
          is_private: boolean
          total_points: number
          username: string
        }[]
      }
      set_username: {
        Args: { new_display: string; new_username: string }
        Returns: {
          avatar_url: string | null
          bio: string | null
          biological_sex: string | null
          birth_date: string | null
          created_at: string
          daily_minutes: number | null
          deleted_at: string | null
          display_name: string
          equipment: string[]
          height_cm: number | null
          id: string
          is_private: boolean
          level: number
          notification_prefs: Json
          primary_goal: string | null
          restrictions: string[]
          streak_best: number
          streak_current: number
          timezone: string
          total_points: number
          updated_at: string
          username: string
          weekly_days: number | null
          weight_kg: number | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_study_session: {
        Args: {
          p_break_minutes: number
          p_cycles_planned: number
          p_focus_minutes: number
          p_routine_task_id?: string
          p_technique: string
        }
        Returns: string
      }
      target_calories: {
        Args: { primary_goal: string; tdee: number }
        Returns: number
      }
      toggle_follow: { Args: { p_followed_id: string }; Returns: Json }
      unlock_achievement: {
        Args: { p_slug: string; p_user_id: string }
        Returns: boolean
      }
      weekly_volume_per_muscle: {
        Args: { p_user_id: string }
        Returns: {
          muscle_group: string
          sets: number
          total_kg: number
        }[]
      }
    }
    Enums: {
      fasting_protocol:
        | "16_8"
        | "14_10"
        | "18_6"
        | "20_4"
        | "omad"
        | "5_2"
        | "custom"
      fasting_status: "completed" | "broken_early"
      meal_type: "breakfast" | "lunch" | "snack" | "dinner"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      fasting_protocol: [
        "16_8",
        "14_10",
        "18_6",
        "20_4",
        "omad",
        "5_2",
        "custom",
      ],
      fasting_status: ["completed", "broken_early"],
      meal_type: ["breakfast", "lunch", "snack", "dinner"],
    },
  },
} as const
