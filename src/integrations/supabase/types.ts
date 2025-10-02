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
      annotations: {
        Row: {
          content: string
          created_at: string
          id: string
          source_id: string | null
          source_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      class_insights: {
        Row: {
          action_label: string | null
          action_route: string | null
          class_id: string
          created_at: string | null
          description: string
          id: string
          insight_type: string
          title: string
        }
        Insert: {
          action_label?: string | null
          action_route?: string | null
          class_id: string
          created_at?: string | null
          description: string
          id?: string
          insight_type: string
          title: string
        }
        Update: {
          action_label?: string | null
          action_route?: string | null
          class_id?: string
          created_at?: string | null
          description?: string
          id?: string
          insight_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_insights_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          course: string
          created_at: string | null
          id: string
          name: string
          period: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          course: string
          created_at?: string | null
          id?: string
          name: string
          period: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          course?: string
          created_at?: string | null
          id?: string
          name?: string
          period?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lesson_plans: {
        Row: {
          content: string | null
          created_at: string
          duration: string | null
          id: string
          notes: string | null
          status: string
          teacher_id: string
          topic: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          notes?: string | null
          status?: string
          teacher_id: string
          topic: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          notes?: string | null
          status?: string
          teacher_id?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_materials: {
        Row: {
          class_id: string
          created_at: string | null
          file_type: string
          file_url: string
          id: string
          teacher_id: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          file_type: string
          file_url: string
          id?: string
          teacher_id: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          file_type?: string
          file_url?: string
          id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_materials_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          city: string | null
          course: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          period: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          university: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          course?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          period?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          university?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          course?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          period?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          university?: string | null
          updated_at?: string | null
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
      app_role: "student" | "teacher"
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
      app_role: ["student", "teacher"],
    },
  },
} as const
