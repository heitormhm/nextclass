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
          tags: string[] | null
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
          tags?: string[] | null
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
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      class_enrollments: {
        Row: {
          class_id: string
          enrolled_at: string | null
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string | null
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      class_events: {
        Row: {
          category: Database["public"]["Enums"]["event_category"] | null
          class_id: string | null
          color: Database["public"]["Enums"]["event_color"] | null
          created_at: string | null
          description: string | null
          disciplina_id: string | null
          end_time: string
          event_date: string
          event_type: string
          id: string
          location: string | null
          notes: string | null
          notify_email: boolean | null
          notify_platform: boolean | null
          start_time: string
          status: string | null
          title: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["event_category"] | null
          class_id?: string | null
          color?: Database["public"]["Enums"]["event_color"] | null
          created_at?: string | null
          description?: string | null
          disciplina_id?: string | null
          end_time: string
          event_date: string
          event_type: string
          id?: string
          location?: string | null
          notes?: string | null
          notify_email?: boolean | null
          notify_platform?: boolean | null
          start_time: string
          status?: string | null
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["event_category"] | null
          class_id?: string | null
          color?: Database["public"]["Enums"]["event_color"] | null
          created_at?: string | null
          description?: string | null
          disciplina_id?: string | null
          end_time?: string
          event_date?: string
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          notify_email?: boolean | null
          notify_platform?: boolean | null
          start_time?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_events_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_events_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
        ]
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
      conversation_suggestions: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          message_index: number
          suggestions: Json
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          message_index: number
          suggestions: Json
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_index?: number
          suggestions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "conversation_suggestions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
          user_id: string
          user_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
          user_role: string
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
          user_role?: string
        }
        Relationships: []
      }
      deep_search_sessions: {
        Row: {
          created_at: string
          error: string | null
          id: string
          progress_step: string | null
          query: string
          result: string | null
          search_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          progress_step?: string | null
          query: string
          result?: string | null
          search_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          progress_step?: string | null
          query?: string
          result?: string | null
          search_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      disciplinas: {
        Row: {
          carga_horaria: number | null
          codigo: string | null
          created_at: string
          ementa: string | null
          id: string
          nome: string
          teacher_id: string
          turma_id: string
          updated_at: string
        }
        Insert: {
          carga_horaria?: number | null
          codigo?: string | null
          created_at?: string
          ementa?: string | null
          id?: string
          nome: string
          teacher_id: string
          turma_id: string
          updated_at?: string
        }
        Update: {
          carga_horaria?: number | null
          codigo?: string | null
          created_at?: string
          ementa?: string | null
          id?: string
          nome?: string
          teacher_id?: string
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
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
      generated_flashcard_sets: {
        Row: {
          cards: Json
          conversation_id: string | null
          created_at: string | null
          id: string
          title: string
          topic: string
          user_id: string
        }
        Insert: {
          cards: Json
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          title: string
          topic: string
          user_id: string
        }
        Update: {
          cards?: Json
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          title?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_flashcard_sets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_quizzes: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          questions: Json
          title: string
          topic: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          questions: Json
          title: string
          topic: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          questions?: Json
          title?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_quizzes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assessment_date: string
          assessment_type: string
          class_id: string
          created_at: string | null
          description: string | null
          grade: number
          id: string
          max_grade: number
          student_id: string
          subject: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          assessment_date?: string
          assessment_type: string
          class_id: string
          created_at?: string | null
          description?: string | null
          grade: number
          id?: string
          max_grade?: number
          student_id: string
          subject: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          assessment_date?: string
          assessment_type?: string
          class_id?: string
          created_at?: string | null
          description?: string | null
          grade?: number
          id?: string
          max_grade?: number
          student_id?: string
          subject?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_locations: {
        Row: {
          created_at: string | null
          full_address: string | null
          id: string
          last_used_at: string | null
          name: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_address?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_address?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      internship_sessions: {
        Row: {
          ai_summary: Json | null
          created_at: string | null
          duration: number | null
          id: string
          internship_type: string
          location_details: string | null
          location_name: string
          tags: string[] | null
          transcript: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: Json | null
          created_at?: string | null
          duration?: number | null
          id?: string
          internship_type: string
          location_details?: string | null
          location_name: string
          tags?: string[] | null
          transcript?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: Json | null
          created_at?: string | null
          duration?: number | null
          id?: string
          internship_type?: string
          location_details?: string | null
          location_name?: string
          tags?: string[] | null
          transcript?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      internship_tags: {
        Row: {
          created_at: string | null
          id: string
          last_used_at: string | null
          tag: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          tag: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          tag?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          conversation_id: string | null
          created_at: string
          error_log: string | null
          id: string
          input_payload: Json
          intermediate_data: Json | null
          job_type: string
          result: string | null
          status: string
          updated_at: string
          user_id: string
          user_role: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error_log?: string | null
          id?: string
          input_payload: Json
          intermediate_data?: Json | null
          job_type: string
          result?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_role: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error_log?: string | null
          id?: string
          input_payload?: Json
          intermediate_data?: Json | null
          job_type?: string
          result?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_deep_search_sessions: {
        Row: {
          created_at: string
          error: string | null
          id: string
          lecture_id: string
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
          error?: string | null
          id?: string
          lecture_id: string
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
          error?: string | null
          id?: string
          lecture_id?: string
          progress_step?: string | null
          query?: string
          research_data?: Json | null
          result?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_deep_search_sessions_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_views: {
        Row: {
          id: string
          lecture_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          lecture_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          lecture_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_views_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          audio_url: string | null
          class_id: string | null
          created_at: string
          disciplina_id: string | null
          duration: number | null
          id: string
          lesson_plan_url: string | null
          material_didatico_v2: string | null
          raw_transcript: string
          status: string
          structured_content: Json | null
          tags: string[] | null
          teacher_id: string
          title: string
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          class_id?: string | null
          created_at?: string
          disciplina_id?: string | null
          duration?: number | null
          id?: string
          lesson_plan_url?: string | null
          material_didatico_v2?: string | null
          raw_transcript: string
          status?: string
          structured_content?: Json | null
          tags?: string[] | null
          teacher_id: string
          title?: string
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          class_id?: string | null
          created_at?: string
          disciplina_id?: string | null
          duration?: number | null
          id?: string
          lesson_plan_url?: string | null
          material_didatico_v2?: string | null
          raw_transcript?: string
          status?: string
          structured_content?: Json | null
          tags?: string[] | null
          teacher_id?: string
          title?: string
          turma_id?: string | null
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
          {
            foreignKeyName: "lectures_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
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
          created_at: string | null
          description: string | null
          disciplina_id: string | null
          file_type: string
          file_url: string
          id: string
          tags: string[] | null
          teacher_id: string
          title: string
          turma_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          disciplina_id?: string | null
          file_type: string
          file_url: string
          id?: string
          tags?: string[] | null
          teacher_id: string
          title: string
          turma_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          disciplina_id?: string | null
          file_type?: string
          file_url?: string
          id?: string
          tags?: string[] | null
          teacher_id?: string
          title?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_materials_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_materials_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
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
          metadata: Json | null
          role: string
          suggestions_job_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          suggestions_job_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          suggestions_job_id?: string | null
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
            foreignKeyName: "messages_suggestions_job_id_fkey"
            columns: ["suggestions_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          event_id: string | null
          event_type: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_events: {
        Row: {
          color: Database["public"]["Enums"]["event_color"] | null
          created_at: string | null
          description: string | null
          end_time: string
          event_date: string
          event_type: string | null
          id: string
          notes: string | null
          notification_email: boolean | null
          notification_platform: boolean | null
          start_time: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          color?: Database["public"]["Enums"]["event_color"] | null
          created_at?: string | null
          description?: string | null
          end_time: string
          event_date: string
          event_type?: string | null
          id?: string
          notes?: string | null
          notification_email?: boolean | null
          notification_platform?: boolean | null
          start_time: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          color?: Database["public"]["Enums"]["event_color"] | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_date?: string
          event_type?: string | null
          id?: string
          notes?: string | null
          notification_email?: boolean | null
          notification_platform?: boolean | null
          start_time?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          lecture_id: string | null
          max_score: number
          percentage: number | null
          quiz_source: string | null
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
          quiz_source?: string | null
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
          quiz_source?: string | null
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
      recommendations: {
        Row: {
          action_route: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          is_active: boolean
          priority: string
          title: string
          user_id: string
        }
        Insert: {
          action_route: string
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title: string
          user_id: string
        }
        Update: {
          action_route?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          actual_role: string
          attempted_role: string
          attempted_route: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          actual_role: string
          attempted_role: string
          attempted_route: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          actual_role?: string
          attempted_role?: string
          attempted_route?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_insights: {
        Row: {
          action_type: string
          context: Json | null
          created_at: string | null
          id: string
          topic: string
          user_id: string
        }
        Insert: {
          action_type: string
          context?: Json | null
          created_at?: string | null
          id?: string
          topic: string
          user_id: string
        }
        Update: {
          action_type?: string
          context?: Json | null
          created_at?: string | null
          id?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_access_codes: {
        Row: {
          batch_id: string | null
          code: string
          created_at: string | null
          created_by_admin_id: string
          expires_at: string | null
          id: string
          is_used: boolean | null
          notes: string | null
          used_at: string | null
          used_by_teacher_id: string | null
        }
        Insert: {
          batch_id?: string | null
          code: string
          created_at?: string | null
          created_by_admin_id: string
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          notes?: string | null
          used_at?: string | null
          used_by_teacher_id?: string | null
        }
        Update: {
          batch_id?: string | null
          code?: string
          created_at?: string | null
          created_by_admin_id?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          notes?: string | null
          used_at?: string | null
          used_by_teacher_id?: string | null
        }
        Relationships: []
      }
      teacher_flashcards: {
        Row: {
          cards: Json
          created_at: string | null
          id: string
          lecture_id: string
          teacher_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          cards: Json
          created_at?: string | null
          id?: string
          lecture_id: string
          teacher_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          cards?: Json
          created_at?: string | null
          id?: string
          lecture_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_flashcards_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: true
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_jobs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          input_payload: Json | null
          job_type: string
          lecture_id: string
          progress: number | null
          progress_message: string | null
          result_payload: Json | null
          status: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_payload?: Json | null
          job_type: string
          lecture_id: string
          progress?: number | null
          progress_message?: string | null
          result_payload?: Json | null
          status?: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_payload?: Json | null
          job_type?: string
          lecture_id?: string
          progress?: number | null
          progress_message?: string | null
          result_payload?: Json | null
          status?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_jobs_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_quizzes: {
        Row: {
          created_at: string | null
          id: string
          lecture_id: string
          questions: Json
          teacher_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lecture_id: string
          questions: Json
          teacher_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lecture_id?: string
          questions?: Json
          teacher_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_quizzes_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: true
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_turma_access: {
        Row: {
          created_at: string
          id: string
          teacher_id: string
          turma_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          teacher_id: string
          turma_id: string
        }
        Update: {
          created_at?: string
          id?: string
          teacher_id?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_turma_access_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
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
          teacher_id: string | null
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
          teacher_id?: string | null
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
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_validated: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
          validated_at: string | null
          validation_code_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_validated?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validation_code_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_validated?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validation_code_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_validation_code_id_fkey"
            columns: ["validation_code_id"]
            isOneToOne: false
            referencedRelation: "teacher_access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          city: string | null
          course: string | null
          cpf: string | null
          created_at: string | null
          email: string
          email_notifications: boolean | null
          full_name: string
          id: string
          period: string | null
          phone: string | null
          transcription_language: string | null
          university: string | null
          updated_at: string | null
          video_quality: string | null
          weekly_report_enabled: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          course?: string | null
          cpf?: string | null
          created_at?: string | null
          email: string
          email_notifications?: boolean | null
          full_name: string
          id: string
          period?: string | null
          phone?: string | null
          transcription_language?: string | null
          university?: string | null
          updated_at?: string | null
          video_quality?: string | null
          weekly_report_enabled?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          course?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string
          email_notifications?: boolean | null
          full_name?: string
          id?: string
          period?: string | null
          phone?: string | null
          transcription_language?: string | null
          university?: string | null
          updated_at?: string | null
          video_quality?: string | null
          weekly_report_enabled?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_available_turmas: {
        Args: never
        Returns: {
          cidade: string
          curso: string
          faculdade: string
          periodo: string
        }[]
      }
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
      event_category:
        | "aula"
        | "prova"
        | "atividade_avaliativa"
        | "trabalho_grupo"
        | "estagio"
        | "atividade_pesquisa"
        | "seminario"
        | "reuniao"
        | "outro"
      event_color:
        | "rosa"
        | "roxo"
        | "azul"
        | "verde"
        | "amarelo"
        | "laranja"
        | "vermelho"
        | "cinza"
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
      app_role: ["student", "teacher", "admin"],
      event_category: [
        "aula",
        "prova",
        "atividade_avaliativa",
        "trabalho_grupo",
        "estagio",
        "atividade_pesquisa",
        "seminario",
        "reuniao",
        "outro",
      ],
      event_color: [
        "rosa",
        "roxo",
        "azul",
        "verde",
        "amarelo",
        "laranja",
        "vermelho",
        "cinza",
      ],
    },
  },
} as const
