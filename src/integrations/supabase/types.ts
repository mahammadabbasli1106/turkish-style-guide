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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      avatars: {
        Row: {
          category: string | null
          id: string
          image_url: string
          name: string
        }
        Insert: {
          category?: string | null
          id?: string
          image_url: string
          name: string
        }
        Update: {
          category?: string | null
          id?: string
          image_url?: string
          name?: string
        }
        Relationships: []
      }
      clothing_items: {
        Row: {
          ai_tags: string[] | null
          category: Database["public"]["Enums"]["clothing_category"]
          color: string | null
          created_at: string
          id: string
          image_url: string
          name: string
          season: string[] | null
          user_id: string
        }
        Insert: {
          ai_tags?: string[] | null
          category: Database["public"]["Enums"]["clothing_category"]
          color?: string | null
          created_at?: string
          id?: string
          image_url: string
          name: string
          season?: string[] | null
          user_id: string
        }
        Update: {
          ai_tags?: string[] | null
          category?: Database["public"]["Enums"]["clothing_category"]
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          season?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      outfit_suggestions: {
        Row: {
          ai_reasoning: string | null
          created_at: string
          footwear_id: string | null
          id: string
          is_favorite: boolean | null
          lower_body_id: string | null
          occasion: string | null
          outerwear_id: string | null
          outfit_name: string | null
          style: Database["public"]["Enums"]["style_preference"] | null
          upper_body_id: string | null
          user_id: string
          viewed_at: string | null
          weather_info: Json | null
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string
          footwear_id?: string | null
          id?: string
          is_favorite?: boolean | null
          lower_body_id?: string | null
          occasion?: string | null
          outerwear_id?: string | null
          outfit_name?: string | null
          style?: Database["public"]["Enums"]["style_preference"] | null
          upper_body_id?: string | null
          user_id: string
          viewed_at?: string | null
          weather_info?: Json | null
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string
          footwear_id?: string | null
          id?: string
          is_favorite?: boolean | null
          lower_body_id?: string | null
          occasion?: string | null
          outerwear_id?: string | null
          outfit_name?: string | null
          style?: Database["public"]["Enums"]["style_preference"] | null
          upper_body_id?: string | null
          user_id?: string
          viewed_at?: string | null
          weather_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "outfit_suggestions_footwear_id_fkey"
            columns: ["footwear_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_suggestions_lower_body_id_fkey"
            columns: ["lower_body_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_suggestions_outerwear_id_fkey"
            columns: ["outerwear_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_suggestions_upper_body_id_fkey"
            columns: ["upper_body_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_id: string
          avatar_type: string | null
          avatar_url: string | null
          closet_permission_granted: boolean | null
          country_code: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_body_photo_url: string | null
          gender: string | null
          goals: string[] | null
          height: number | null
          height_unit: string | null
          id: string
          location: string | null
          location_permission_granted: boolean | null
          onboarding_completed: boolean | null
          phone_number: string | null
          updated_at: string
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          auth_id: string
          avatar_type?: string | null
          avatar_url?: string | null
          closet_permission_granted?: boolean | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_body_photo_url?: string | null
          gender?: string | null
          goals?: string[] | null
          height?: number | null
          height_unit?: string | null
          id?: string
          location?: string | null
          location_permission_granted?: boolean | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          auth_id?: string
          avatar_type?: string | null
          avatar_url?: string | null
          closet_permission_granted?: boolean | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_body_photo_url?: string | null
          gender?: string | null
          goals?: string[] | null
          height?: number | null
          height_unit?: string | null
          id?: string
          location?: string | null
          location_permission_granted?: boolean | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      try_on_sessions: {
        Row: {
          clothing_item_id: string | null
          created_at: string
          id: string
          result_image_url: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          clothing_item_id?: string | null
          created_at?: string
          id?: string
          result_image_url?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          clothing_item_id?: string | null
          created_at?: string
          id?: string
          result_image_url?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "try_on_sessions_clothing_item_id_fkey"
            columns: ["clothing_item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          default_location: string | null
          id: string
          preferred_styles:
            | Database["public"]["Enums"]["style_preference"][]
            | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_location?: string | null
          id?: string
          preferred_styles?:
            | Database["public"]["Enums"]["style_preference"][]
            | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_location?: string | null
          id?: string
          preferred_styles?:
            | Database["public"]["Enums"]["style_preference"][]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      clothing_category:
        | "upper_body"
        | "lower_body"
        | "outerwear"
        | "footwear"
        | "accessory"
      style_preference:
        | "streetwear"
        | "classic"
        | "business"
        | "casual"
        | "sporty"
        | "elegant"
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
      clothing_category: [
        "upper_body",
        "lower_body",
        "outerwear",
        "footwear",
        "accessory",
      ],
      style_preference: [
        "streetwear",
        "classic",
        "business",
        "casual",
        "sporty",
        "elegant",
      ],
    },
  },
} as const
