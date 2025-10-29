import { supabase } from '@/integrations/supabase/client';

export type AIActionType = 
  | 'improve_grammar'
  | 'simplify'
  | 'expand'
  | 'summarize'
  | 'improve_didactic'
  | 'format_lesson_plan'
  | 'create_rubric'
  | 'generate_activity';

interface FormattingResult {
  success: boolean;
  formattedText?: string;
  structuredContent?: any;
  isStructured: boolean;
  suggestions?: string;
  warnings?: string[];
  error?: string;
}

export class AIFormattingService {
  /**
   * Formatar conteúdo com IA
   */
  static async formatContent(
    content: string,
    action: AIActionType,
    options?: {
      timeout?: number;
      onProgress?: (message: string) => void;
    }
  ): Promise<FormattingResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(), 
      options?.timeout || 120000
    );
    
    try {
      const functionName = action === 'generate_activity' 
        ? 'teacher-generate-activity' 
        : action === 'format_lesson_plan'
        ? 'generate-lesson-plan'
        : 'teacher-ai-text-formatting';
      
      console.log(`[AIFormatting] Calling: ${functionName} (action: ${action})`);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: action === 'generate_activity' || action === 'format_lesson_plan'
          ? { content }
          : { content, action },
        // @ts-ignore
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (error) {
        throw new Error(error.message || 'Erro ao processar com IA');
      }
      
      return this.processAIResponse(data, action);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          isStructured: false,
          error: 'Timeout: Processamento demorou mais de 2 minutos'
        };
      }
      
      return {
        success: false,
        isStructured: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }
  
  /**
   * Processar resposta da IA
   */
  private static processAIResponse(
    data: any,
    action: AIActionType
  ): FormattingResult {
    const structuredActions: AIActionType[] = [
      'improve_didactic',
      'format_lesson_plan',
      'generate_activity'
    ];
    
    if (!structuredActions.includes(action)) {
      return {
        success: true,
        isStructured: false,
        formattedText: data.formattedText || data.structured_content,
        suggestions: data.suggestions
      };
    }
    
    try {
      const jsonContent = this.extractJSON(
        data.formattedText || JSON.stringify(data.structured_content)
      );
      
      const parsed = JSON.parse(jsonContent);
      
      if (!parsed.conteudo || !Array.isArray(parsed.conteudo)) {
        throw new Error('JSON não possui array "conteudo"');
      }
      
      if (parsed.conteudo.length === 0) {
        throw new Error('Array "conteudo" está vazio');
      }
      
      const warnings: string[] = [];
      const removedDiagrams = parsed.conteudo.filter((b: any) => 
        b.tipo === 'paragrafo' && 
        (b.texto?.includes('Diagrama removido') || b.texto?.includes('diagrama removido'))
      ).length;
      
      if (removedDiagrams > 0) {
        warnings.push(`${removedDiagrams} diagrama(s) removido(s) por conter erros`);
      }
      
      return {
        success: true,
        isStructured: true,
        structuredContent: parsed,
        formattedText: jsonContent,
        warnings: warnings.length > 0 ? warnings : undefined
      };
      
    } catch (error: any) {
      console.error('[AIFormatting] Failed to parse structured content:', error.message);
      return {
        success: false,
        isStructured: false,
        error: `Erro ao processar JSON: ${error.message}`
      };
    }
  }
  
  /**
   * Extrair JSON limpo de resposta da IA
   */
  private static extractJSON(text: string): string {
    let cleaned = text.trim();
    
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, '');
    cleaned = cleaned.replace(/\n?```\s*$/gm, '');
    
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    return cleaned.trim();
  }
  
  /**
   * Obter toast message customizada por ação
   */
  static getSuccessMessage(action: AIActionType, result: FormattingResult): string {
    if (!result.structuredContent) {
      return 'Texto formatado com sucesso!';
    }
    
    const blockCount = result.structuredContent.conteudo.length;
    
    switch (action) {
      case 'improve_didactic':
        return `Material didático gerado! ${blockCount} blocos pedagógicos criados`;
      
      case 'generate_activity':
        const objetivas = result.structuredContent.conteudo.filter(
          (b: any) => b.tipo === 'questao_multipla_escolha'
        ).length;
        const abertas = result.structuredContent.conteudo.filter(
          (b: any) => b.tipo === 'questao_aberta'
        ).length;
        return `Atividade gerada! ${objetivas} objetivas + ${abertas} abertas`;
      
      case 'format_lesson_plan':
        return `Plano de aula gerado! ${blockCount} blocos criados`;
      
      default:
        return 'Processamento concluído com sucesso!';
    }
  }
}
