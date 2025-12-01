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
      orders: {
        Row: {
          created_at: string
          id: string
          order_date: string
          order_number: string
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
          created_at?: string
          id?: string
          order_date?: string
          order_number: string
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
          created_at?: string
          id?: string
          order_date?: string
          order_number?: string
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
        Relationships: []
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
          gender: string | null
          id: string
          is_neutered: boolean | null
          name: string
          type: string
          updated_at: string | null
          user_id: string
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
          gender?: string | null
          id?: string
          is_neutered?: boolean | null
          name: string
          type: string
          updated_at?: string | null
          user_id: string
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
          gender?: string | null
          id?: string
          is_neutered?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          pet_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          pet_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          pet_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          points: number
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          points?: number
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          points?: number
          updated_at?: string | null
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
      redemptions: {
        Row: {
          expires_at: string
          id: string
          redeemed_at: string
          redemption_code: string
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          expires_at: string
          id?: string
          redeemed_at?: string
          redemption_code: string
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
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
      rewards: {
        Row: {
          created_at: string
          description: string
          gradient: string
          icon: string
          id: string
          is_active: boolean
          points_cost: number
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
          points_cost: number
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
          points_cost?: number
          title?: string
          type?: string
          value?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_email: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
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
      app_role: ["admin", "user"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
