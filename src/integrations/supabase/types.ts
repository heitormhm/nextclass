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
      conversations: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deep_search_sessions: {
        Row: {
          created_at: string
          id: string
          progress_step: string | null
          query: string
          research_data: Json | null
          result: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          progress_step?: string | null
          query: string
          research_data?: Json | null
          result?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          progress_step?: string | null
          query?: string
          research_data?: Json | null
          result?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcard_reviews: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          lecture_id: string | null
          percentage: number | null
          topic: string
          total_count: number
          user_id: string
        }
        Insert: {
          correct_count: number
          created_at?: string
          id?: string
          lecture_id?: string | null
          percentage?: number | null
          topic: string
          total_count: number
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          lecture_id?: string | null
          percentage?: number | null
          topic?: string
          total_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          class_id: string | null
          created_at: string
          duration: number | null
          id: string
          raw_transcript: string
          status: string
          structured_content: Json | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          raw_transcript: string
          status?: string
          structured_content?: Json | null
          teacher_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          raw_transcript?: string
          status?: string
          structured_content?: Json | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          content: string | null
          created_at: string
          duration: string | null
          id: string
          notes: string | null
          progress_step: string | null
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
          progress_step?: string | null
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
          progress_step?: string | null
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          lecture_id: string | null
          max_score: number
          percentage: number | null
          score: number
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lecture_id?: string | null
          max_score: number
          percentage?: number | null
          score: number
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lecture_id?: string | null
          max_score?: number
          percentage?: number | null
          score?: number
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      turma_enrollments: {
        Row: {
          aluno_id: string
          enrolled_at: string
          id: string
          turma_id: string
        }
        Insert: {
          aluno_id: string
          enrolled_at?: string
          id?: string
          turma_id: string
        }
        Update: {
          aluno_id?: string
          enrolled_at?: string
          id?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turma_enrollments_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_enrollments_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          cidade: string
          created_at: string
          curso: string
          faculdade: string
          id: string
          nome_turma: string
          periodo: string
          updated_at: string
        }
        Insert: {
          cidade?: string
          created_at?: string
          curso?: string
          faculdade?: string
          id?: string
          nome_turma: string
          periodo: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          created_at?: string
          curso?: string
          faculdade?: string
          id?: string
          nome_turma?: string
          periodo?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
