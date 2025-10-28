import { supabase } from "@/integrations/supabase/client";
import { MaterialGenerationRequest } from "../types/materialGeneration.types";

export class MaterialGenerationService {
  /**
   * Validates if user has teacher role
   */
  static async validateTeacherRole(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'teacher') {
      throw new Error("Apenas professores podem gerar material didático");
    }
  }

  /**
   * Creates a new generation job in the database
   */
  static async createJob(request: MaterialGenerationRequest): Promise<string> {
    await this.validateTeacherRole();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Create job in teacher_jobs table
    const { data: jobData, error: jobError } = await supabase
      .from('teacher_jobs')
      .insert({
        teacher_id: user.id,
        lecture_id: request.lectureId,
        job_type: 'GENERATE_LECTURE_DEEP_SEARCH',
        status: 'PENDING',
        input_payload: {
          lectureId: request.lectureId,
          lectureTitle: request.lectureTitle,
          transcript: request.transcript || '',
        },
        progress: 0,
        progress_message: 'Iniciando pesquisa profunda...'
      })
      .select()
      .single();

    if (jobError || !jobData) {
      throw new Error(`Erro ao criar job: ${jobError?.message || 'Desconhecido'}`);
    }

    // Invoke edge function to process job
    const { error: functionError } = await supabase.functions.invoke('teacher-job-runner', {
      body: { jobId: jobData.id },
    });

    if (functionError) {
      throw new Error(`Erro ao iniciar processamento: ${functionError.message}`);
    }

    return jobData.id;
  }

  /**
   * Gets the current status of a job
   */
  static async getJobStatus(jobId: string) {
    const { data, error } = await supabase
      .from('teacher_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw new Error(`Erro ao buscar status: ${error.message}`);
    return data;
  }
}
