import { supabase } from "@/integrations/supabase/client";
import { MaterialGenerationRequest } from "../types/materialGeneration.types";
import { validateLectureData, logValidationWarnings } from '../utils/validations';

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

    // ✅ FASE 1: Buscar lecture completa com tags
    const { data: lectureData, error: lectureError } = await supabase
      .from('lectures')
      .select('tags, teacher_id')
      .eq('id', request.lectureId)
      .single();

    if (lectureError) {
      console.error('[MaterialGenerationService] Failed to fetch lecture:', lectureError);
      throw new Error(`Erro ao buscar aula: ${lectureError.message}`);
    }

    // ✅ Buscar nome do professor
    const { data: teacherProfile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', lectureData.teacher_id)
      .single();

    // ✅ FASE 3: Validar dados antes de criar job
    const validation = validateLectureData(
      request.lectureTitle,
      lectureData.tags,
      request.transcript
    );

    logValidationWarnings(validation, 'MaterialGenerationService');

    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
    }

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
          tags: lectureData.tags || [], // ✅ Adicionar tags
          teacherName: teacherProfile?.full_name || 'Professor', // ✅ Adicionar nome
        },
        progress: 0,
        progress_message: 'Iniciando pesquisa profunda...'
      })
      .select()
      .single();

    if (jobError || !jobData) {
      throw new Error(`Erro ao criar job: ${jobError?.message || 'Desconhecido'}`);
    }

    // ✅ PHASE C: Add detailed logging and error handling
    console.log('[MaterialGeneration] Invoking edge function:', {
      jobId: jobData.id,
      lectureId: request.lectureId,
      lectureTitle: request.lectureTitle,
      transcriptLength: request.transcript?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Invoke edge function to process job
    const { data: edgeResponse, error: functionError } = await supabase.functions.invoke('teacher-job-runner', {
      body: { jobId: jobData.id },
    });

    console.log('[MaterialGeneration] Edge function response:', {
      hasData: !!edgeResponse,
      hasError: !!functionError,
      error: functionError,
      response: edgeResponse
    });

    if (functionError) {
      console.error('[MaterialGeneration] Edge function failed:', functionError);
      throw new Error(`Erro ao iniciar processamento: ${functionError.message}`);
    }

    console.log('[MaterialGeneration] ✅ Job created successfully:', jobData.id);
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
