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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          points_awarded: number
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          points_awarded?: number
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          points_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      add_yours_responses: {
        Row: {
          created_at: string
          id: string
          sticker_id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sticker_id: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sticker_id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "add_yours_responses_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "story_stickers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "add_yours_responses_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_tasks: {
        Row: {
          assigned_to: string | null
          attachments: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          rating: number | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          rating?: number | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          rating?: number | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      adoption_pets: {
        Row: {
          age_months: number | null
          age_years: number | null
          breed: string | null
          created_at: string | null
          description: string | null
          gender: string | null
          id: string
          image_url: string | null
          is_neutered: boolean | null
          is_vaccinated: boolean | null
          name: string
          organization_address: string | null
          organization_city: string | null
          organization_email: string | null
          organization_logo_url: string | null
          organization_name: string | null
          organization_phone: string | null
          organization_website: string | null
          size: string
          special_needs: string | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          age_months?: number | null
          age_years?: number | null
          breed?: string | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          is_neutered?: boolean | null
          is_vaccinated?: boolean | null
          name: string
          organization_address?: string | null
          organization_city?: string | null
          organization_email?: string | null
          organization_logo_url?: string | null
          organization_name?: string | null
          organization_phone?: string | null
          organization_website?: string | null
          size: string
          special_needs?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          age_months?: number | null
          age_years?: number | null
          breed?: string | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          is_neutered?: boolean | null
          is_vaccinated?: boolean | null
          name?: string
          organization_address?: string | null
          organization_city?: string | null
          organization_email?: string | null
          organization_logo_url?: string | null
          organization_name?: string | null
          organization_phone?: string | null
          organization_website?: string | null
          size?: string
          special_needs?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      adoption_requests: {
        Row: {
          address: string
          created_at: string | null
          email: string
          experience_details: string | null
          full_name: string
          has_experience: boolean | null
          has_other_pets: boolean | null
          id: string
          other_pets_details: string | null
          pet_id: string
          phone: string
          reason: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string | null
          email: string
          experience_details?: string | null
          full_name: string
          has_experience?: boolean | null
          has_other_pets?: boolean | null
          id?: string
          other_pets_details?: string | null
          pet_id: string
          phone: string
          reason: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string | null
          email?: string
          experience_details?: string | null
          full_name?: string
          has_experience?: boolean | null
          has_other_pets?: boolean | null
          id?: string
          other_pets_details?: string | null
          pet_id?: string
          phone?: string
          reason?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_requests_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "adoption_pets"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: string[] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: string[] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[] | null
        }
        Relationships: []
      }
      auto_replies: {
        Row: {
          away_enabled: boolean | null
          away_end_time: string | null
          away_message: string | null
          away_start_time: string | null
          created_at: string
          greeting_enabled: boolean | null
          greeting_message: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          away_enabled?: boolean | null
          away_end_time?: string | null
          away_message?: string | null
          away_start_time?: string | null
          created_at?: string
          greeting_enabled?: boolean | null
          greeting_message?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          away_enabled?: boolean | null
          away_end_time?: string | null
          away_message?: string | null
          away_start_time?: string | null
          created_at?: string
          greeting_enabled?: boolean | null
          greeting_message?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          actions: Json
          created_at: string
          created_by: string | null
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          trigger_conditions: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          trigger_conditions?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          trigger_conditions?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      automations: {
        Row: {
          actions: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          trigger_config: Json | null
          trigger_count: number | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          trigger_config?: Json | null
          trigger_count?: number | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          trigger_config?: Json | null
          trigger_count?: number | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          condition_type: string
          condition_value: number
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          name_he: string
          points_reward: number
          rarity: string
        }
        Insert: {
          condition_type: string
          condition_value: number
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          name_he: string
          points_reward?: number
          rarity: string
        }
        Update: {
          condition_type?: string
          condition_value?: number
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          name_he?: string
          points_reward?: number
          rarity?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          content_he: string | null
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          scheduled_at: string | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          title_he: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          content_he?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          title_he?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          content_he?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          title_he?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          phone: string | null
          updated_at: string
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          working_hours?: Json | null
        }
        Relationships: []
      }
      branded_content: {
        Row: {
          created_at: string
          id: string
          partner_business_id: string
          post_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          partner_business_id: string
          post_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          partner_business_id?: string
          post_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branded_content_partner_business_id_fkey"
            columns: ["partner_business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branded_content_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      breed_detection_history: {
        Row: {
          avatar_url: string | null
          breed: string | null
          confidence: number | null
          created_at: string
          detected_at: string
          id: string
          pet_id: string
        }
        Insert: {
          avatar_url?: string | null
          breed?: string | null
          confidence?: number | null
          created_at?: string
          detected_at?: string
          id?: string
          pet_id: string
        }
        Update: {
          avatar_url?: string | null
          breed?: string | null
          confidence?: number | null
          created_at?: string
          detected_at?: string
          id?: string
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breed_detection_history_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      business_analytics: {
        Row: {
          business_id: string
          id: string
          viewed_at: string
          viewer_age_range: string | null
          viewer_city: string | null
          viewer_id: string | null
        }
        Insert: {
          business_id: string
          id?: string
          viewed_at?: string
          viewer_age_range?: string | null
          viewer_city?: string | null
          viewer_id?: string | null
        }
        Update: {
          business_id?: string
          id?: string
          viewed_at?: string
          viewer_age_range?: string | null
          viewer_city?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          business_id: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          service_type: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          business_id: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          service_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          business_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          service_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_products: {
        Row: {
          average_rating: number | null
          business_id: string
          category: string | null
          created_at: string
          description: string | null
          flagged_at: string | null
          flagged_reason: string | null
          flavors: string[] | null
          id: string
          image_url: string
          images: string[] | null
          in_stock: boolean | null
          is_featured: boolean | null
          is_flagged: boolean | null
          name: string
          needs_image_review: boolean | null
          needs_price_review: boolean | null
          original_price: number | null
          pet_type: Database["public"]["Enums"]["pet_type"] | null
          price: number
          price_per_weight: number | null
          price_suggestion_reason: string | null
          review_count: number | null
          sale_price: number | null
          sku: string | null
          suggested_price: number | null
          updated_at: string
          weight_unit: string | null
        }
        Insert: {
          average_rating?: number | null
          business_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          flagged_at?: string | null
          flagged_reason?: string | null
          flavors?: string[] | null
          id?: string
          image_url: string
          images?: string[] | null
          in_stock?: boolean | null
          is_featured?: boolean | null
          is_flagged?: boolean | null
          name: string
          needs_image_review?: boolean | null
          needs_price_review?: boolean | null
          original_price?: number | null
          pet_type?: Database["public"]["Enums"]["pet_type"] | null
          price: number
          price_per_weight?: number | null
          price_suggestion_reason?: string | null
          review_count?: number | null
          sale_price?: number | null
          sku?: string | null
          suggested_price?: number | null
          updated_at?: string
          weight_unit?: string | null
        }
        Update: {
          average_rating?: number | null
          business_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          flagged_at?: string | null
          flagged_reason?: string | null
          flavors?: string[] | null
          id?: string
          image_url?: string
          images?: string[] | null
          in_stock?: boolean | null
          is_featured?: boolean | null
          is_flagged?: boolean | null
          name?: string
          needs_image_review?: boolean | null
          needs_price_review?: boolean | null
          original_price?: number | null
          pet_type?: Database["public"]["Enums"]["pet_type"] | null
          price?: number
          price_per_weight?: number | null
          price_suggestion_reason?: string | null
          review_count?: number | null
          sale_price?: number | null
          sku?: string | null
          suggested_price?: number | null
          updated_at?: string
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          business_name: string
          business_type: Database["public"]["Enums"]["business_type"]
          city: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          phone: string | null
          price_range: string | null
          rating: number | null
          services: string[] | null
          total_reviews: number | null
          updated_at: string
          user_id: string | null
          verification_notes: string | null
          verification_requested_at: string | null
          verified_by: string | null
          view_count: number | null
          website: string | null
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          business_name: string
          business_type: Database["public"]["Enums"]["business_type"]
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          services?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string | null
          verification_notes?: string | null
          verification_requested_at?: string | null
          verified_by?: string | null
          view_count?: number | null
          website?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          business_name?: string
          business_type?: Database["public"]["Enums"]["business_type"]
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          services?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string | null
          verification_notes?: string | null
          verification_requested_at?: string | null
          verified_by?: string | null
          view_count?: number | null
          website?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      business_subscriptions: {
        Row: {
          business_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          price: number | null
          started_at: string
          subscriber_id: string
          tier: string | null
        }
        Insert: {
          business_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          price?: number | null
          started_at?: string
          subscriber_id: string
          tier?: string | null
        }
        Update: {
          business_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          price?: number | null
          started_at?: string
          subscriber_id?: string
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          attendees: string[] | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string
          location: string | null
          recurrence_rule: string | null
          reminder_minutes: number | null
          start_time: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          attendees?: string[] | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          attendees?: string[] | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cardcom_customers: {
        Row: {
          company: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cardcom_events: {
        Row: {
          id: string
          payload_json: Json
          received_at: string
        }
        Insert: {
          id?: string
          payload_json: Json
          received_at?: string
        }
        Update: {
          id?: string
          payload_json?: Json
          received_at?: string
        }
        Relationships: []
      }
      cardcom_payments: {
        Row: {
          amount_ils: number
          cardcom_transaction_id: string | null
          created_at: string
          id: string
          product_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_ils: number
          cardcom_transaction_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_ils?: number
          cardcom_transaction_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cardcom_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cardcom_products"
            referencedColumns: ["id"]
          },
        ]
      }
      cardcom_products: {
        Row: {
          active: boolean
          billing_period: string | null
          cardcom_product_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price_ils: number
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_period?: string | null
          cardcom_product_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_ils: number
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_period?: string | null
          cardcom_product_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_ils?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      cardcom_subscriptions: {
        Row: {
          cardcom_subscription_id: string | null
          created_at: string
          current_period_end: string | null
          id: string
          product_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cardcom_subscription_id?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cardcom_subscription_id?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cardcom_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cardcom_products"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_he: string | null
          ends_at: string | null
          hashtag: string
          id: string
          is_active: boolean
          participant_count: number
          starts_at: string
          title: string
          title_he: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_he?: string | null
          ends_at?: string | null
          hashtag: string
          id?: string
          is_active?: boolean
          participant_count?: number
          starts_at?: string
          title: string
          title_he: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_he?: string | null
          ends_at?: string | null
          hashtag?: string
          id?: string
          is_active?: boolean
          participant_count?: number
          starts_at?: string
          title?: string
          title_he?: string
          updated_at?: string
        }
        Relationships: []
      }
      close_friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      collection_products: {
        Row: {
          added_at: string
          collection_id: string
          display_order: number | null
          id: string
          product_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          display_order?: number | null
          id?: string
          product_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          display_order?: number | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "product_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_by: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_type: string
          created_at: string
          created_by: string | null
          currency: string | null
          document_url: string | null
          end_date: string | null
          id: string
          notes: string | null
          party_email: string | null
          party_name: string
          party_phone: string | null
          signed_at: string | null
          signed_by: string | null
          start_date: string
          status: string | null
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          contract_type: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          party_email?: string | null
          party_name: string
          party_phone?: string | null
          signed_at?: string | null
          signed_by?: string | null
          start_date: string
          status?: string | null
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          contract_type?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          party_email?: string | null
          party_name?: string
          party_phone?: string | null
          signed_at?: string | null
          signed_by?: string | null
          start_date?: string
          status?: string | null
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          id: string
          order_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          order_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          order_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          updated_at: string
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          activity_type: string
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          deal_id: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          outcome: string | null
          scheduled_at: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          outcome?: string | null
          scheduled_at?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          outcome?: string | null
          scheduled_at?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          custom_fields: Json | null
          customer_id: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          lost_at: string | null
          lost_reason: string | null
          pipeline_id: string | null
          probability: number | null
          stage: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          value: number | null
          won_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          pipeline_id?: string | null
          probability?: number | null
          stage?: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          value?: number | null
          won_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          pipeline_id?: string | null
          probability?: number | null
          stage?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          value?: number | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          stages: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          stages?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          stages?: Json
          updated_at?: string
        }
        Relationships: []
      }
      custom_field_values: {
        Row: {
          created_at: string
          entity_id: string
          field_id: string
          id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          field_id: string
          id?: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          field_id?: string
          id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          display_order: number | null
          entity_type: string
          field_label: string
          field_label_he: string | null
          field_name: string
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          options: Json | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          entity_type: string
          field_label: string
          field_label_he?: string | null
          field_name: string
          field_type: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          entity_type?: string
          field_label?: string
          field_label_he?: string | null
          field_name?: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
        }
        Relationships: []
      }
      customer_charges: {
        Row: {
          amount: number
          charge_type: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          charge_type?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          charge_type?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_debts: {
        Row: {
          amount: number
          created_at: string
          customer_email: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          due_date: string | null
          id: string
          notes: string | null
          original_amount: number
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_email?: string | null
          customer_id: string
          customer_name: string
          customer_phone?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          original_amount: number
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_email?: string | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          original_amount?: number
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          note_type: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          note_type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          note_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_reminders: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          due_date: string
          id: string
          priority: string | null
          status: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          due_date: string
          id?: string
          priority?: string | null
          status?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          due_date?: string
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      customer_tag_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          customer_id: string
          id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          customer_id: string
          id?: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          customer_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "customer_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      daily_training_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          lessons_completed: number | null
          pet_id: string | null
          session_date: string
          streak_day: number | null
          total_xp_earned: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lessons_completed?: number | null
          pet_id?: string | null
          session_date?: string
          streak_day?: number | null
          total_xp_earned?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lessons_completed?: number | null
          pet_id?: string | null
          session_date?: string
          streak_day?: number | null
          total_xp_earned?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_training_sessions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_parks: {
        Row: {
          address: string
          agility: boolean | null
          city: string
          coordinates: unknown
          created_at: string
          created_by: string | null
          fencing: boolean | null
          google_maps_link: string | null
          id: string
          latitude: number | null
          lighting: boolean | null
          longitude: number | null
          name: string
          notes: string | null
          parking: boolean | null
          rating: number | null
          shade: boolean | null
          size: string | null
          source: string | null
          status: string
          total_reviews: number | null
          updated_at: string
          updated_by: string | null
          verified: boolean | null
          water: boolean | null
        }
        Insert: {
          address: string
          agility?: boolean | null
          city: string
          coordinates?: unknown
          created_at?: string
          created_by?: string | null
          fencing?: boolean | null
          google_maps_link?: string | null
          id?: string
          latitude?: number | null
          lighting?: boolean | null
          longitude?: number | null
          name: string
          notes?: string | null
          parking?: boolean | null
          rating?: number | null
          shade?: boolean | null
          size?: string | null
          source?: string | null
          status?: string
          total_reviews?: number | null
          updated_at?: string
          updated_by?: string | null
          verified?: boolean | null
          water?: boolean | null
        }
        Update: {
          address?: string
          agility?: boolean | null
          city?: string
          coordinates?: unknown
          created_at?: string
          created_by?: string | null
          fencing?: boolean | null
          google_maps_link?: string | null
          id?: string
          latitude?: number | null
          lighting?: boolean | null
          longitude?: number | null
          name?: string
          notes?: string | null
          parking?: boolean | null
          rating?: number | null
          shade?: boolean | null
          size?: string | null
          source?: string | null
          status?: string
          total_reviews?: number | null
          updated_at?: string
          updated_by?: string | null
          verified?: boolean | null
          water?: boolean | null
        }
        Relationships: []
      }
      draft_posts: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          id: string
          image_url: string | null
          media_urls: string[] | null
          pet_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          media_urls?: string[] | null
          pet_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          media_urls?: string[] | null
          pet_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_shifts: {
        Row: {
          approved_by: string | null
          break_minutes: number | null
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          break_minutes?: number | null
          clock_in: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          approved_by?: string | null
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string
          created_at: string
          currency: string | null
          description: string | null
          expense_date: string
          id: string
          receipt_url: string | null
          status: string | null
          submitted_by: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category: string
          created_at?: string
          currency?: string | null
          description?: string | null
          expense_date: string
          id?: string
          receipt_url?: string | null
          status?: string | null
          submitted_by?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          receipt_url?: string | null
          status?: string | null
          submitted_by?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      financial_records: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          month: number
          record_date: string
          type: string
          updated_at: string
          year: number
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          month: number
          record_date?: string
          type: string
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          month?: number
          record_date?: string
          type?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          code: string
          created_at: string
          currency: string | null
          current_balance: number
          expires_at: string | null
          id: string
          initial_balance: number
          purchased_by: string | null
          recipient_email: string | null
          recipient_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string | null
          current_balance: number
          expires_at?: string | null
          id?: string
          initial_balance: number
          purchased_by?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string | null
          current_balance?: number
          expires_at?: string | null
          id?: string
          initial_balance?: number
          purchased_by?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      grooming_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string | null
          id: string
          notes: string | null
          pet_id: string | null
          price: number | null
          salon_id: string
          service_type: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          price?: number | null
          salon_id: string
          service_type: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          price?: number | null
          salon_id?: string
          service_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grooming_appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grooming_appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "grooming_salons"
            referencedColumns: ["id"]
          },
        ]
      }
      grooming_salons: {
        Row: {
          address: string
          city: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          phone: string | null
          price_range: string | null
          rating: number | null
          services: string[] | null
          total_reviews: number | null
          updated_at: string | null
          working_hours: Json | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          services?: string[] | null
          total_reviews?: number | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          services?: string[] | null
          total_reviews?: number | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      guide_products: {
        Row: {
          created_at: string
          display_order: number | null
          guide_id: string
          id: string
          note: string | null
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          guide_id: string
          id?: string
          note?: string | null
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          guide_id?: string
          id?: string
          note?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_products_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "product_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtags: {
        Row: {
          created_at: string
          id: string
          name: string
          post_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          post_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          post_count?: number | null
        }
        Relationships: []
      }
      highlight_stories: {
        Row: {
          added_at: string | null
          display_order: number | null
          highlight_id: string
          id: string
          story_id: string
        }
        Insert: {
          added_at?: string | null
          display_order?: number | null
          highlight_id: string
          id?: string
          story_id: string
        }
        Update: {
          added_at?: string | null
          display_order?: number | null
          highlight_id?: string
          id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlight_stories_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "story_highlights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlight_stories_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          content_he: string
          created_at: string
          display_order: number | null
          helpful_count: number | null
          id: string
          is_published: boolean | null
          tags: string[] | null
          title: string
          title_he: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          category: string
          content: string
          content_he: string
          created_at?: string
          display_order?: number | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          tags?: string[] | null
          title: string
          title_he: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          content_he?: string
          created_at?: string
          display_order?: number | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          tags?: string[] | null
          title?: string
          title_he?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      lead_forms: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          fields: Json
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_forms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          form_id: string
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      live_shopping_products: {
        Row: {
          display_order: number | null
          featured_at: string | null
          id: string
          product_id: string
          sale_price: number | null
          sales_count: number | null
          session_id: string
        }
        Insert: {
          display_order?: number | null
          featured_at?: string | null
          id?: string
          product_id: string
          sale_price?: number | null
          sales_count?: number | null
          session_id: string
        }
        Update: {
          display_order?: number | null
          featured_at?: string | null
          id?: string
          product_id?: string
          sale_price?: number | null
          sales_count?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_shopping_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_shopping_products_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_shopping_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_shopping_sessions: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          stream_url: string | null
          thumbnail_url: string | null
          title: string
          viewer_count: number | null
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          stream_url?: string | null
          thumbnail_url?: string | null
          title: string
          viewer_count?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_shopping_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          post_count: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          post_count?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          post_count?: number | null
        }
        Relationships: []
      }
      loyalty_events: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          points_earned: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points_earned?: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points_earned?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_point_rules: {
        Row: {
          action_name_he: string
          action_type: string
          cooldown_hours: number | null
          created_at: string
          daily_limit: number | null
          id: string
          is_active: boolean | null
          points: number
          requires_tenure_days: number | null
          updated_at: string
          weekly_limit: number | null
        }
        Insert: {
          action_name_he: string
          action_type: string
          cooldown_hours?: number | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_active?: boolean | null
          points?: number
          requires_tenure_days?: number | null
          updated_at?: string
          weekly_limit?: number | null
        }
        Update: {
          action_name_he?: string
          action_type?: string
          cooldown_hours?: number | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_active?: boolean | null
          points?: number
          requires_tenure_days?: number | null
          updated_at?: string
          weekly_limit?: number | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
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
        ]
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          subject: string | null
          type: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          subject?: string | null
          type: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string | null
          type?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          is_vanish: boolean | null
          label: Database["public"]["Enums"]["dm_label"] | null
          message_text: string
          message_type: string | null
          receiver_id: string
          sender_id: string
          updated_at: string | null
          vanish_after_read: boolean | null
          voice_duration: number | null
          voice_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_vanish?: boolean | null
          label?: Database["public"]["Enums"]["dm_label"] | null
          message_text: string
          message_type?: string | null
          receiver_id: string
          sender_id: string
          updated_at?: string | null
          vanish_after_read?: boolean | null
          voice_duration?: number | null
          voice_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_vanish?: boolean | null
          label?: Database["public"]["Enums"]["dm_label"] | null
          message_text?: string
          message_type?: string | null
          receiver_id?: string
          sender_id?: string
          updated_at?: string | null
          vanish_after_read?: boolean | null
          voice_duration?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      metrics_daily: {
        Row: {
          average_order_value: number | null
          created_at: string
          expense_breakdown: Json | null
          gross_profit: number | null
          id: string
          items_sold: number | null
          metric_date: string
          net_revenue: number | null
          new_customers: number | null
          orders_change_percent: number | null
          returning_customers: number | null
          revenue_change_percent: number | null
          top_products: Json | null
          total_customers: number | null
          total_expenses: number | null
          total_orders: number | null
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          average_order_value?: number | null
          created_at?: string
          expense_breakdown?: Json | null
          gross_profit?: number | null
          id?: string
          items_sold?: number | null
          metric_date: string
          net_revenue?: number | null
          new_customers?: number | null
          orders_change_percent?: number | null
          returning_customers?: number | null
          revenue_change_percent?: number | null
          top_products?: Json | null
          total_customers?: number | null
          total_expenses?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          average_order_value?: number | null
          created_at?: string
          expense_breakdown?: Json | null
          gross_profit?: number | null
          id?: string
          items_sold?: number | null
          metric_date?: string
          net_revenue?: number | null
          new_customers?: number | null
          orders_change_percent?: number | null
          returning_customers?: number | null
          revenue_change_percent?: number | null
          top_products?: Json | null
          total_customers?: number | null
          total_expenses?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      monthly_balance: {
        Row: {
          balance: number | null
          created_at: string
          fixed_expenses: number | null
          id: string
          merchandise_expenses: number | null
          month: number
          salary_expenses: number | null
          total_expenses: number | null
          total_income: number | null
          updated_at: string
          variable_expenses: number | null
          year: number
        }
        Insert: {
          balance?: number | null
          created_at?: string
          fixed_expenses?: number | null
          id?: string
          merchandise_expenses?: number | null
          month: number
          salary_expenses?: number | null
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
          variable_expenses?: number | null
          year: number
        }
        Update: {
          balance?: number | null
          created_at?: string
          fixed_expenses?: number | null
          id?: string
          merchandise_expenses?: number | null
          month?: number
          salary_expenses?: number | null
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
          variable_expenses?: number | null
          year?: number
        }
        Relationships: []
      }
      normalized_customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          average_order_value: number | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          customer_segment: string | null
          email: string | null
          external_id: string | null
          first_name: string | null
          first_order_date: string | null
          full_name: string | null
          id: string
          last_name: string | null
          last_order_date: string | null
          lifetime_value: number | null
          metadata: Json | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          source_type: string | null
          state: string | null
          tags: string[] | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          average_order_value?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          customer_segment?: string | null
          email?: string | null
          external_id?: string | null
          first_name?: string | null
          first_order_date?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          last_order_date?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          source_type?: string | null
          state?: string | null
          tags?: string[] | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          average_order_value?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          customer_segment?: string | null
          email?: string | null
          external_id?: string | null
          first_name?: string | null
          first_order_date?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          last_order_date?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          source_type?: string | null
          state?: string | null
          tags?: string[] | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      normalized_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          expense_date: string
          id: string
          is_recurring: boolean | null
          metadata: Json | null
          receipt_url: string | null
          recurrence_period: string | null
          source_import_id: string | null
          subcategory: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expense_date: string
          id?: string
          is_recurring?: boolean | null
          metadata?: Json | null
          receipt_url?: string | null
          recurrence_period?: string | null
          source_import_id?: string | null
          subcategory?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          metadata?: Json | null
          receipt_url?: string | null
          recurrence_period?: string | null
          source_import_id?: string | null
          subcategory?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "normalized_expenses_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "raw_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      normalized_products: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string
          currency: string | null
          description: string | null
          external_id: string | null
          id: string
          image_url: string | null
          last_sold_date: string | null
          low_stock_threshold: number | null
          metadata: Json | null
          name: string
          price: number
          sale_price: number | null
          sku: string | null
          source_type: string | null
          status: string | null
          stock_quantity: number | null
          subcategory: string | null
          tags: string[] | null
          total_revenue: number | null
          total_sold: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          last_sold_date?: string | null
          low_stock_threshold?: number | null
          metadata?: Json | null
          name: string
          price: number
          sale_price?: number | null
          sku?: string | null
          source_type?: string | null
          status?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          tags?: string[] | null
          total_revenue?: number | null
          total_sold?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          last_sold_date?: string | null
          low_stock_threshold?: number | null
          metadata?: Json | null
          name?: string
          price?: number
          sale_price?: number | null
          sku?: string | null
          source_type?: string | null
          status?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          tags?: string[] | null
          total_revenue?: number | null
          total_sold?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      normalized_transaction_items: {
        Row: {
          cost_price: number | null
          created_at: string
          discount_amount: number | null
          external_product_id: string | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          discount_amount?: number | null
          external_product_id?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sku?: string | null
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          discount_amount?: number | null
          external_product_id?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          total_price?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "normalized_transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "normalized_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalized_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "normalized_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      normalized_transactions: {
        Row: {
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          discount_amount: number | null
          external_id: string | null
          fulfillment_status: string | null
          id: string
          metadata: Json | null
          notes: string | null
          payment_status: string | null
          shipping_amount: number | null
          source_import_id: string | null
          source_type: string
          status: string | null
          subtotal: number
          tax_amount: number | null
          total: number
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          external_id?: string | null
          fulfillment_status?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_status?: string | null
          shipping_amount?: number | null
          source_import_id?: string | null
          source_type: string
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total: number
          transaction_date: string
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          external_id?: string | null
          fulfillment_status?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_status?: string | null
          shipping_amount?: number | null
          source_import_id?: string | null
          source_type?: string
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total?: number
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "normalized_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "normalized_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalized_transactions_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "raw_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          created_at: string
          id: string
          message_template: string
          name: string
          title_template: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_template: string
          name: string
          title_template: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_template?: string
          name?: string
          title_template?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_image: string
          product_name: string
          quantity: number
          size: string | null
          variant: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_image: string
          product_name: string
          quantity: number
          size?: string | null
          variant?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_image?: string
          product_name?: string
          quantity?: number
          size?: string | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking: {
        Row: {
          carrier: string | null
          created_at: string
          description: string | null
          estimated_delivery: string | null
          id: string
          location: string | null
          order_id: string
          status: string
          tracking_number: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          id?: string
          location?: string | null
          order_id: string
          status: string
          tracking_number?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          id?: string
          location?: string | null
          order_id?: string
          status?: string
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          discount_amount: number | null
          id: string
          order_date: string
          order_number: string
          payment_installments: number | null
          payment_method: string
          shipping: number
          shipping_address: Json
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          order_date?: string
          order_number: string
          payment_installments?: number | null
          payment_method: string
          shipping: number
          shipping_address: Json
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          order_date?: string
          order_number?: string
          payment_installments?: number | null
          payment_method?: string
          shipping?: number
          shipping_address?: Json
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      park_checkins: {
        Row: {
          checked_in_at: string
          checked_out_at: string | null
          created_at: string
          id: string
          park_id: string
          pet_id: string | null
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_out_at?: string | null
          created_at?: string
          id?: string
          park_id: string
          pet_id?: string | null
          user_id: string
        }
        Update: {
          checked_in_at?: string
          checked_out_at?: string | null
          created_at?: string
          id?: string
          park_id?: string
          pet_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "park_checkins_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "dog_parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "park_checkins_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      park_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          park_id: string
          photo_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          park_id: string
          photo_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          park_id?: string
          photo_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "park_photos_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "dog_parks"
            referencedColumns: ["id"]
          },
        ]
      }
      park_reviews: {
        Row: {
          created_at: string
          id: string
          park_id: string
          photos: string[] | null
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          park_id: string
          photos?: string[] | null
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          park_id?: string
          photos?: string[] | null
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "park_reviews_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "dog_parks"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp: string
          used: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp: string
          used?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp?: string
          used?: boolean
        }
        Relationships: []
      }
      personalization_scores: {
        Row: {
          content_type: string
          factors: Json | null
          id: string
          last_calculated: string
          score: number
          user_id: string
        }
        Insert: {
          content_type: string
          factors?: Json | null
          id?: string
          last_calculated?: string
          score?: number
          user_id: string
        }
        Update: {
          content_type?: string
          factors?: Json | null
          id?: string
          last_calculated?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      pet_documents: {
        Row: {
          description: string | null
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          pet_id: string
          title: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          description?: string | null
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          pet_id: string
          title: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          description?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          pet_id?: string
          title?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_documents_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          pet_id: string | null
          photo_url: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          pet_id?: string | null
          photo_url: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          pet_id?: string | null
          photo_url?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_photos_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_vaccinations: {
        Row: {
          administered_by: string | null
          batch_number: string | null
          created_at: string
          document_url: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          pet_id: string
          updated_at: string
          user_id: string
          vaccination_date: string
          vaccine_name: string
        }
        Insert: {
          administered_by?: string | null
          batch_number?: string | null
          created_at?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          pet_id: string
          updated_at?: string
          user_id: string
          vaccination_date: string
          vaccine_name: string
        }
        Update: {
          administered_by?: string | null
          batch_number?: string | null
          created_at?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
          updated_at?: string
          user_id?: string
          vaccination_date?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_vaccinations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_vet_visits: {
        Row: {
          clinic_name: string | null
          cost: number | null
          created_at: string
          diagnosis: string | null
          document_url: string | null
          id: string
          next_visit_date: string | null
          notes: string | null
          pet_id: string
          treatment: string | null
          updated_at: string
          user_id: string
          vet_name: string | null
          visit_date: string
          visit_type: string | null
        }
        Insert: {
          clinic_name?: string | null
          cost?: number | null
          created_at?: string
          diagnosis?: string | null
          document_url?: string | null
          id?: string
          next_visit_date?: string | null
          notes?: string | null
          pet_id: string
          treatment?: string | null
          updated_at?: string
          user_id: string
          vet_name?: string | null
          visit_date: string
          visit_type?: string | null
        }
        Update: {
          clinic_name?: string | null
          cost?: number | null
          created_at?: string
          diagnosis?: string | null
          document_url?: string | null
          id?: string
          next_visit_date?: string | null
          notes?: string | null
          pet_id?: string
          treatment?: string | null
          updated_at?: string
          user_id?: string
          vet_name?: string | null
          visit_date?: string
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_vet_visits_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age: number | null
          archived: boolean
          archived_at: string | null
          avatar_url: string | null
          birth_date: string | null
          breed: string | null
          breed_confidence: number | null
          created_at: string | null
          favorite_activities: string[] | null
          gender: string | null
          has_insurance: boolean | null
          health_notes: string | null
          id: string
          insurance_company: string | null
          insurance_expiry_date: string | null
          insurance_policy_number: string | null
          is_neutered: boolean | null
          last_vet_visit: string | null
          mood_score: number | null
          name: string
          next_vet_visit: string | null
          personality_tags: string[] | null
          type: string
          updated_at: string | null
          user_id: string
          vet_clinic: string | null
          vet_name: string | null
          vet_phone: string | null
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          age?: number | null
          archived?: boolean
          archived_at?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          breed?: string | null
          breed_confidence?: number | null
          created_at?: string | null
          favorite_activities?: string[] | null
          gender?: string | null
          has_insurance?: boolean | null
          health_notes?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          is_neutered?: boolean | null
          last_vet_visit?: string | null
          mood_score?: number | null
          name: string
          next_vet_visit?: string | null
          personality_tags?: string[] | null
          type: string
          updated_at?: string | null
          user_id: string
          vet_clinic?: string | null
          vet_name?: string | null
          vet_phone?: string | null
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          age?: number | null
          archived?: boolean
          archived_at?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          breed?: string | null
          breed_confidence?: number | null
          created_at?: string | null
          favorite_activities?: string[] | null
          gender?: string | null
          has_insurance?: boolean | null
          health_notes?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          is_neutered?: boolean | null
          last_vet_visit?: string | null
          mood_score?: number | null
          name?: string
          next_vet_visit?: string | null
          personality_tags?: string[] | null
          type?: string
          updated_at?: string | null
          user_id?: string
          vet_clinic?: string | null
          vet_name?: string | null
          vet_phone?: string | null
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      post_collaborators: {
        Row: {
          collaborator_id: string
          created_at: string
          id: string
          post_id: string
          status: string | null
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          id?: string
          post_id: string
          status?: string | null
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          id?: string
          post_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_collaborators_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_hashtags: {
        Row: {
          created_at: string
          hashtag_id: string
          id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          hashtag_id: string
          id?: string
          post_id: string
        }
        Update: {
          created_at?: string
          hashtag_id?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      post_product_tags: {
        Row: {
          created_at: string
          id: string
          position_x: number | null
          position_y: number | null
          post_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position_x?: number | null
          position_y?: number | null
          post_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position_x?: number | null
          position_y?: number | null
          post_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_product_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_featured: boolean | null
          is_pinned: boolean | null
          location_id: string | null
          media_type: string | null
          media_urls: string[] | null
          pet_id: string | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          location_id?: string | null
          media_type?: string | null
          media_urls?: string[] | null
          pet_id?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          location_id?: string | null
          media_type?: string | null
          media_urls?: string[] | null
          pet_id?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          notified_at: string | null
          original_price: number
          product_id: string
          target_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          notified_at?: string | null
          original_price: number
          product_id: string
          target_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          notified_at?: string | null
          original_price?: number
          product_id?: string
          target_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rules: {
        Row: {
          conditions: Json | null
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          rule_type: string
          starts_at: string | null
          updated_at: string
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          discount_type: string
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          rule_type: string
          starts_at?: string | null
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          rule_type?: string
          starts_at?: string | null
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      product_collections: {
        Row: {
          business_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_featured: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_guides: {
        Row: {
          business_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          business_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          business_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_guides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_main: boolean | null
          product_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_main?: boolean | null
          product_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_main?: boolean | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          helpful_count: number | null
          id: string
          is_verified_purchase: boolean | null
          photos: string[] | null
          product_id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          photos?: string[] | null
          product_id: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          photos?: string[] | null
          product_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          variation_name: string
          variation_price: number | null
          variation_sku: string | null
          variation_stock_status:
            | Database["public"]["Enums"]["stock_status"]
            | null
          variation_value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          variation_name: string
          variation_price?: number | null
          variation_sku?: string | null
          variation_stock_status?:
            | Database["public"]["Enums"]["stock_status"]
            | null
          variation_value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          variation_name?: string
          variation_price?: number | null
          variation_sku?: string | null
          variation_stock_status?:
            | Database["public"]["Enums"]["stock_status"]
            | null
          variation_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "scraped_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allow_messages_from: string | null
          apartment_number: string | null
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          blocked_at: string | null
          blocked_by: string | null
          blocked_reason: string | null
          building_code: string | null
          city: string | null
          created_at: string | null
          email: string | null
          favorite_breeds: string[] | null
          first_name: string | null
          full_name: string | null
          house_number: string | null
          id: string
          interests: string[] | null
          is_online: boolean | null
          last_active_at: string | null
          last_name: string | null
          last_seen_at: string | null
          location_blur_enabled: boolean | null
          phone: string | null
          points: number
          postal_code: string | null
          profile_visibility: string | null
          quiet_mode_until: string | null
          region: string | null
          show_activity_status: boolean | null
          show_email: boolean | null
          show_location: boolean | null
          street: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          allow_messages_from?: string | null
          apartment_number?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          building_code?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          favorite_breeds?: string[] | null
          first_name?: string | null
          full_name?: string | null
          house_number?: string | null
          id: string
          interests?: string[] | null
          is_online?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          location_blur_enabled?: boolean | null
          phone?: string | null
          points?: number
          postal_code?: string | null
          profile_visibility?: string | null
          quiet_mode_until?: string | null
          region?: string | null
          show_activity_status?: boolean | null
          show_email?: boolean | null
          show_location?: boolean | null
          street?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          allow_messages_from?: string | null
          apartment_number?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          building_code?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          favorite_breeds?: string[] | null
          first_name?: string | null
          full_name?: string | null
          house_number?: string | null
          id?: string
          interests?: string[] | null
          is_online?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          location_blur_enabled?: boolean | null
          phone?: string | null
          points?: number
          postal_code?: string | null
          profile_visibility?: string | null
          quiet_mode_until?: string | null
          region?: string | null
          show_activity_status?: boolean | null
          show_email?: boolean | null
          show_location?: boolean | null
          street?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      promotional_offers: {
        Row: {
          badge_text: string
          button_color: string
          button_link: string
          button_text: string
          created_at: string
          display_order: number
          expires_at: string | null
          gradient_from: string
          gradient_to: string
          id: string
          is_active: boolean
          subtitle: string
          title: string
        }
        Insert: {
          badge_text: string
          button_color?: string
          button_link?: string
          button_text?: string
          created_at?: string
          display_order?: number
          expires_at?: string | null
          gradient_from?: string
          gradient_to?: string
          id?: string
          is_active?: boolean
          subtitle: string
          title: string
        }
        Update: {
          badge_text?: string
          button_color?: string
          button_link?: string
          button_text?: string
          created_at?: string
          display_order?: number
          expires_at?: string | null
          gradient_from?: string
          gradient_to?: string
          id?: string
          is_active?: boolean
          subtitle?: string
          title?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          created_at: string
          id: string
          message_text: string
          shortcut: string | null
          title: string
          updated_at: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_text: string
          shortcut?: string | null
          title: string
          updated_at?: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_text?: string
          shortcut?: string | null
          title?: string
          updated_at?: string
          use_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      raw_imports: {
        Row: {
          created_at: string
          created_by: string | null
          data_type: string
          error_message: string | null
          id: string
          processed_at: string | null
          raw_data: Json
          row_index: number | null
          source_name: string | null
          source_type: string
          status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_type: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          raw_data: Json
          row_index?: number | null
          source_name?: string | null
          source_type: string
          status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_type?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          raw_data?: Json
          row_index?: number | null
          source_name?: string | null
          source_type?: string
          status?: string | null
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          expires_at: string
          id: string
          redeemed_at: string
          redemption_code: string
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          expires_at: string
          id?: string
          redeemed_at?: string
          redemption_code: string
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          expires_at?: string
          id?: string
          redeemed_at?: string
          redemption_code?: string
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          reel_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          reel_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          reel_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_product_tags: {
        Row: {
          created_at: string
          id: string
          position_x: number | null
          position_y: number | null
          post_id: string
          product_id: string
          timestamp_seconds: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          position_x?: number | null
          position_y?: number | null
          post_id: string
          product_id: string
          timestamp_seconds?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          position_x?: number | null
          position_y?: number | null
          post_id?: string
          product_id?: string
          timestamp_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_product_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          audio_id: string | null
          caption: string | null
          created_at: string
          duration: number | null
          id: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string
          view_count: number | null
        }
        Insert: {
          audio_id?: string | null
          caption?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url: string
          view_count?: number | null
        }
        Update: {
          audio_id?: string | null
          caption?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: []
      }
      reference_prices: {
        Row: {
          category: string | null
          created_at: string
          id: string
          market_price: number
          product_name: string
          sku: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          market_price: number
          product_name: string
          sku?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          market_price?: number
          product_name?: string
          sku?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          report_type: Database["public"]["Enums"]["report_type"]
          reported_post_id: string | null
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          report_type: Database["public"]["Enums"]["report_type"]
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_post_id_fkey"
            columns: ["reported_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          description: string
          gradient: string
          icon: string
          id: string
          is_active: boolean
          min_membership_days: number | null
          min_order_amount: number | null
          monthly_limit: number | null
          points_cost: number
          requires_approval: boolean | null
          title: string
          type: string
          value: string
        }
        Insert: {
          created_at?: string
          description: string
          gradient: string
          icon: string
          id?: string
          is_active?: boolean
          min_membership_days?: number | null
          min_order_amount?: number | null
          monthly_limit?: number | null
          points_cost: number
          requires_approval?: boolean | null
          title: string
          type: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string
          gradient?: string
          icon?: string
          id?: string
          is_active?: boolean
          min_membership_days?: number | null
          min_order_amount?: number | null
          monthly_limit?: number | null
          points_cost?: number
          requires_approval?: boolean | null
          title?: string
          type?: string
          value?: string
        }
        Relationships: []
      }
      sales_channels: {
        Row: {
          config: Json | null
          created_at: string
          external_id: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          sync_enabled: boolean | null
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          sync_enabled?: boolean | null
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          sync_enabled?: boolean | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          id: string
          image_url: string
          media_urls: string[] | null
          pet_id: string | null
          scheduled_for: string
          status: string | null
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          media_urls?: string[] | null
          pet_id?: string | null
          scheduled_for: string
          status?: string | null
          user_id: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          media_urls?: string[] | null
          pet_id?: string | null
          scheduled_for?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scraped_products: {
        Row: {
          badges: string[] | null
          brand: string | null
          bullet_points: string[] | null
          canonical_url: string | null
          category_path: string | null
          colors: string[] | null
          created_at: string | null
          currency: string | null
          data_attributes: Json | null
          discount_text: string | null
          final_price: number | null
          flagged_at: string | null
          flagged_reason: string | null
          flavors: string[] | null
          h1_title: string | null
          id: string
          ingredients: string | null
          is_flagged: boolean | null
          json_ld_data: Json | null
          long_description: string | null
          long_description_html: string | null
          main_category: string | null
          main_image_url: string | null
          meta_description: string | null
          meta_title: string | null
          nutrition_info: Json | null
          pet_type: string | null
          product_id: string | null
          product_name: string
          product_url: string
          rating: number | null
          regular_price: number | null
          return_info: string | null
          review_count: number | null
          sale_price: number | null
          sample_review: string | null
          scraped_at: string | null
          shipping_info: string | null
          short_description: string | null
          sizes: string[] | null
          sku: string | null
          stock_badge: string | null
          stock_status: Database["public"]["Enums"]["stock_status"] | null
          sub_category: string | null
          technical_details: Json | null
          updated_at: string | null
          usage_instructions: string | null
          variants: Json | null
          warnings: string | null
          weight: string | null
          weight_unit: string | null
        }
        Insert: {
          badges?: string[] | null
          brand?: string | null
          bullet_points?: string[] | null
          canonical_url?: string | null
          category_path?: string | null
          colors?: string[] | null
          created_at?: string | null
          currency?: string | null
          data_attributes?: Json | null
          discount_text?: string | null
          final_price?: number | null
          flagged_at?: string | null
          flagged_reason?: string | null
          flavors?: string[] | null
          h1_title?: string | null
          id?: string
          ingredients?: string | null
          is_flagged?: boolean | null
          json_ld_data?: Json | null
          long_description?: string | null
          long_description_html?: string | null
          main_category?: string | null
          main_image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nutrition_info?: Json | null
          pet_type?: string | null
          product_id?: string | null
          product_name: string
          product_url: string
          rating?: number | null
          regular_price?: number | null
          return_info?: string | null
          review_count?: number | null
          sale_price?: number | null
          sample_review?: string | null
          scraped_at?: string | null
          shipping_info?: string | null
          short_description?: string | null
          sizes?: string[] | null
          sku?: string | null
          stock_badge?: string | null
          stock_status?: Database["public"]["Enums"]["stock_status"] | null
          sub_category?: string | null
          technical_details?: Json | null
          updated_at?: string | null
          usage_instructions?: string | null
          variants?: Json | null
          warnings?: string | null
          weight?: string | null
          weight_unit?: string | null
        }
        Update: {
          badges?: string[] | null
          brand?: string | null
          bullet_points?: string[] | null
          canonical_url?: string | null
          category_path?: string | null
          colors?: string[] | null
          created_at?: string | null
          currency?: string | null
          data_attributes?: Json | null
          discount_text?: string | null
          final_price?: number | null
          flagged_at?: string | null
          flagged_reason?: string | null
          flavors?: string[] | null
          h1_title?: string | null
          id?: string
          ingredients?: string | null
          is_flagged?: boolean | null
          json_ld_data?: Json | null
          long_description?: string | null
          long_description_html?: string | null
          main_category?: string | null
          main_image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nutrition_info?: Json | null
          pet_type?: string | null
          product_id?: string | null
          product_name?: string
          product_url?: string
          rating?: number | null
          regular_price?: number | null
          return_info?: string | null
          review_count?: number | null
          sale_price?: number | null
          sample_review?: string | null
          scraped_at?: string | null
          shipping_info?: string | null
          short_description?: string | null
          sizes?: string[] | null
          sku?: string | null
          stock_badge?: string | null
          stock_status?: Database["public"]["Enums"]["stock_status"] | null
          sub_category?: string | null
          technical_details?: Json | null
          updated_at?: string | null
          usage_instructions?: string | null
          variants?: Json | null
          warnings?: string | null
          weight?: string | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      scraping_jobs: {
        Row: {
          base_url: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          scraped_pages: number | null
          scraped_products: number | null
          started_at: string | null
          status: string | null
          total_pages: number | null
          total_products: number | null
        }
        Insert: {
          base_url: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          scraped_pages?: number | null
          scraped_products?: number | null
          started_at?: string | null
          status?: string | null
          total_pages?: number | null
          total_products?: number | null
        }
        Update: {
          base_url?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          scraped_pages?: number | null
          scraped_products?: number | null
          started_at?: string | null
          status?: string | null
          total_pages?: number | null
          total_products?: number | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type: string
          media_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: []
      }
      story_highlights: {
        Row: {
          cover_image: string | null
          created_at: string | null
          display_order: number | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          sticker_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          sticker_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          sticker_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_poll_votes_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "story_stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      story_product_tags: {
        Row: {
          created_at: string
          id: string
          position_x: number | null
          position_y: number | null
          product_id: string
          story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position_x?: number | null
          position_y?: number | null
          product_id: string
          story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position_x?: number | null
          position_y?: number | null
          product_id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_product_tags_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_question_answers: {
        Row: {
          answer_text: string
          created_at: string
          id: string
          sticker_id: string
          user_id: string
        }
        Insert: {
          answer_text: string
          created_at?: string
          id?: string
          sticker_id: string
          user_id: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          id?: string
          sticker_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_question_answers_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "story_stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      story_replies: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          receiver_id: string
          sender_id: string
          story_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          receiver_id: string
          sender_id: string
          story_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          receiver_id?: string
          sender_id?: string
          story_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_replies_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_stickers: {
        Row: {
          created_at: string
          data: Json
          id: string
          position_x: number | null
          position_y: number | null
          sticker_type: string
          story_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          position_x?: number | null
          position_y?: number | null
          sticker_type: string
          story_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          position_x?: number | null
          position_y?: number | null
          sticker_type?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_stickers_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          streak_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          notes: string | null
          status: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          status?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          monthly_amount: number | null
          name: string
          notes: string | null
          phone: string | null
          supplier_type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          monthly_amount?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          supplier_type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          monthly_amount?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          supplier_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          priority: string | null
          related_order_id: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          tags: string[] | null
          ticket_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          related_order_id?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          tags?: string[] | null
          ticket_number: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          related_order_id?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          tags?: string[] | null
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          action_required: boolean | null
          action_taken: boolean | null
          alert_type: string
          created_at: string
          dismissed_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          read_by: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          severity: string | null
          title: string
        }
        Insert: {
          action_required?: boolean | null
          action_taken?: boolean | null
          alert_type: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          read_by?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          action_required?: boolean | null
          action_taken?: boolean | null
          alert_type?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          read_by?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          comment_type: string | null
          content: string
          created_at: string
          id: string
          metadata: Json | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_type?: string | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_type?: string | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "admin_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          dependency_type: string | null
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          dependency_type?: string | null
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          dependency_type?: string | null
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "admin_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "admin_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          display_order: number | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          display_order?: number | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          display_order?: number | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "admin_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          default_priority: string | null
          default_tags: string[] | null
          description: string | null
          estimated_hours: number | null
          id: string
          is_active: boolean | null
          name: string
          subtasks: Json | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_priority?: string | null
          default_tags?: string[] | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          subtasks?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_priority?: string | null
          default_tags?: string[] | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          subtasks?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      task_time_entries: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          is_billable: boolean | null
          start_time: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_billable?: boolean | null
          start_time: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_billable?: boolean | null
          start_time?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "admin_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          pet_id: string | null
          points: number
          task_type: string
          title: string
          title_he: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          pet_id?: string | null
          points?: number
          task_type: string
          title: string
          title_he: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          pet_id?: string | null
          points?: number
          task_type?: string
          title?: string
          title_he?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_internal: boolean | null
          message: string
          sender_id: string | null
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message: string
          sender_id?: string | null
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string
          created_at: string | null
          email: string | null
          experience_years: number | null
          id: string
          is_active: boolean | null
          is_certified: boolean | null
          name: string
          phone: string | null
          price_per_session: number | null
          rating: number | null
          specialty: string | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city: string
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          is_certified?: boolean | null
          name: string
          phone?: string | null
          price_per_session?: number | null
          rating?: number | null
          specialty?: string | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          is_certified?: boolean | null
          name?: string
          phone?: string | null
          price_per_session?: number | null
          rating?: number | null
          specialty?: string | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      training_certificates: {
        Row: {
          certificate_number: string
          id: string
          issued_at: string
          module_id: string
          module_title: string | null
          pet_id: string | null
          pet_name: string | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          id?: string
          issued_at?: string
          module_id: string
          module_title?: string | null
          pet_id?: string | null
          pet_name?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          id?: string
          issued_at?: string
          module_id?: string
          module_title?: string | null
          pet_id?: string | null
          pet_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_certificates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificates_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          created_at: string | null
          description: string | null
          duration_weeks: number | null
          id: string
          is_active: boolean | null
          level: string | null
          max_participants: number | null
          price: number | null
          sessions_per_week: number | null
          title: string
          trainer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          max_participants?: number | null
          price?: number | null
          sessions_per_week?: number | null
          title: string
          trainer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          max_participants?: number | null
          price?: number | null
          sessions_per_week?: number | null
          title?: string
          trainer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      training_lessons: {
        Row: {
          created_at: string
          demo_image_url: string | null
          demo_video_url: string | null
          description: string | null
          description_he: string | null
          duration_minutes: number | null
          id: string
          instructions: string | null
          instructions_he: string | null
          lesson_number: number
          module_id: string
          recommended_product_id: string | null
          recommended_product_name: string | null
          recommended_product_reason: string | null
          title: string
          title_he: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          demo_image_url?: string | null
          demo_video_url?: string | null
          description?: string | null
          description_he?: string | null
          duration_minutes?: number | null
          id?: string
          instructions?: string | null
          instructions_he?: string | null
          lesson_number: number
          module_id: string
          recommended_product_id?: string | null
          recommended_product_name?: string | null
          recommended_product_reason?: string | null
          title: string
          title_he: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          demo_image_url?: string | null
          demo_video_url?: string | null
          description?: string | null
          description_he?: string | null
          duration_minutes?: number | null
          id?: string
          instructions?: string | null
          instructions_he?: string | null
          lesson_number?: number
          module_id?: string
          recommended_product_id?: string | null
          recommended_product_name?: string | null
          recommended_product_reason?: string | null
          title?: string
          title_he?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          created_at: string
          description: string | null
          description_he: string | null
          icon: string | null
          id: string
          module_number: number
          title: string
          title_he: string
          total_lessons: number
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_he?: string | null
          icon?: string | null
          id?: string
          module_number: number
          title: string
          title_he: string
          total_lessons?: number
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          description_he?: string | null
          icon?: string | null
          id?: string
          module_number?: number
          title?: string
          title_he?: string
          total_lessons?: number
          xp_reward?: number
        }
        Relationships: []
      }
      training_submissions: {
        Row: {
          ai_analysis: string | null
          ai_approved: boolean | null
          ai_feedback: string | null
          created_at: string
          id: string
          lesson_id: string
          media_type: string
          media_url: string
          pet_id: string | null
          progress_id: string
          reviewed_at: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_approved?: boolean | null
          ai_feedback?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          media_type: string
          media_url: string
          pet_id?: string | null
          progress_id: string
          reviewed_at?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          ai_approved?: boolean | null
          ai_feedback?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          media_type?: string
          media_url?: string
          pet_id?: string | null
          progress_id?: string
          reviewed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_submissions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_submissions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_submissions_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "user_training_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      training_tips: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          difficulty: string | null
          id: string
          likes: number | null
          published_at: string | null
          title: string
          views: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          likes?: number | null
          published_at?: string | null
          title: string
          views?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          likes?: number | null
          published_at?: string | null
          title?: string
          views?: number | null
        }
        Relationships: []
      }
      training_videos: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          likes: number | null
          published_at: string | null
          thumbnail_url: string | null
          title: string
          video_url: string
          views: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          likes?: number | null
          published_at?: string | null
          thumbnail_url?: string | null
          title: string
          video_url: string
          views?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          likes?: number | null
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string
          views?: number | null
        }
        Relationships: []
      }
      user_engagement: {
        Row: {
          action: string
          content_id: string
          content_type: string
          created_at: string
          duration_seconds: number | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          content_id: string
          content_type: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          content_id?: string
          content_type?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          created_at: string
          id: string
          interest_type: string
          interest_value: string
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          interest_type: string
          interest_value: string
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          interest_type?: string
          interest_value?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      user_loyalty_stats: {
        Row: {
          consecutive_months_active: number | null
          created_at: string
          current_rank: string
          current_streak_days: number | null
          first_activity_at: string | null
          id: string
          last_activity_at: string | null
          longest_streak_days: number | null
          rank_level: number
          total_photos: number | null
          total_points: number
          total_purchases: number | null
          total_referrals: number | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consecutive_months_active?: number | null
          created_at?: string
          current_rank?: string
          current_streak_days?: number | null
          first_activity_at?: string | null
          id?: string
          last_activity_at?: string | null
          longest_streak_days?: number | null
          rank_level?: number
          total_photos?: number | null
          total_points?: number
          total_purchases?: number | null
          total_referrals?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consecutive_months_active?: number | null
          created_at?: string
          current_rank?: string
          current_streak_days?: number | null
          first_activity_at?: string | null
          id?: string
          last_activity_at?: string | null
          longest_streak_days?: number | null
          rank_level?: number
          total_photos?: number | null
          total_points?: number
          total_purchases?: number | null
          total_referrals?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notes: {
        Row: {
          content: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          pages_visited: string[] | null
          preferred_tab: string | null
          preferred_view_mode: string | null
          session_end: string | null
          session_start: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          pages_visited?: string[] | null
          preferred_tab?: string | null
          preferred_view_mode?: string | null
          session_end?: string | null
          session_start?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          pages_visited?: string[] | null
          preferred_tab?: string | null
          preferred_view_mode?: string | null
          session_end?: string | null
          session_start?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_training_progress: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          pet_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          pet_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          pet_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_training_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_training_progress_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          product_id: string | null
          purchase_date: string
          serial_number: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          warranty_end_date: string
          warranty_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          purchase_date: string
          serial_number?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          warranty_end_date: string
          warranty_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          purchase_date?: string
          serial_number?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          warranty_end_date?: string
          warranty_type?: string | null
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_status_code: number | null
          last_triggered_at: string | null
          name: string
          retry_count: number | null
          secret: string | null
          success_count: number | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          name: string
          retry_count?: number | null
          secret?: string | null
          success_count?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          name?: string
          retry_count?: number | null
          secret?: string | null
          success_count?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      whatsapp_otps: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
          type: string
          used: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          phone: string
          type?: string
          used?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          type?: string
          used?: boolean
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          notify_on_sale: boolean | null
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_on_sale?: boolean | null
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_on_sale?: boolean | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_redeem: { Args: { p_user_id: string }; Returns: boolean }
      cleanup_expired_whatsapp_otps: { Args: never; Returns: undefined }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_moderator_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_reward_available: { Args: { p_reward_id: string }; Returns: boolean }
      send_post_notification: {
        Args: {
          p_body: string
          p_icon?: string
          p_post_id: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator" | "business" | "org"
      business_type:
        | "vet"
        | "trainer"
        | "groomer"
        | "shop"
        | "pet_sitter"
        | "other"
        | "shelter"
      dm_label: "primary" | "general" | "flagged" | "pending"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      pet_type: "dog" | "cat" | "other" | "all"
      report_status: "pending" | "reviewed" | "resolved" | "dismissed"
      report_type: "spam" | "inappropriate" | "harassment" | "fake" | "other"
      stock_status: "in_stock" | "out_of_stock" | "preorder" | "unknown"
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
      app_role: ["admin", "user", "moderator", "business", "org"],
      business_type: [
        "vet",
        "trainer",
        "groomer",
        "shop",
        "pet_sitter",
        "other",
        "shelter",
      ],
      dm_label: ["primary", "general", "flagged", "pending"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      pet_type: ["dog", "cat", "other", "all"],
      report_status: ["pending", "reviewed", "resolved", "dismissed"],
      report_type: ["spam", "inappropriate", "harassment", "fake", "other"],
      stock_status: ["in_stock", "out_of_stock", "preorder", "unknown"],
    },
  },
} as const
