import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) throw new Error('Unauthorized');

    console.log('🔍 Gerando recomendações para:', user.id);

    // 1️⃣ Buscar desempenho em quizzes (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: quizAttempts, error: quizError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_source', 'student_generated')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (quizError) throw quizError;

    // 2️⃣ Buscar desempenho em flashcards
    const { data: flashcardReviews, error: flashcardError } = await supabase
      .from('flashcard_reviews')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (flashcardError) throw flashcardError;

    // 3️⃣ Analisar desempenho por tópico
    const topicPerformance = new Map();

    // Agrupar quizzes por tópico
    quizAttempts?.forEach(quiz => {
      if (!topicPerformance.has(quiz.topic)) {
        topicPerformance.set(quiz.topic, {
          topic: quiz.topic,
          quizAttempts: 0,
          quizAvgScore: 0,
          flashcardReviews: 0,
          flashcardAvgScore: 0
        });
      }
      const perf = topicPerformance.get(quiz.topic);
      perf.quizAttempts++;
      perf.quizAvgScore += quiz.percentage || 0;
    });

    // Calcular médias de quiz
    topicPerformance.forEach(perf => {
      if (perf.quizAttempts > 0) {
        perf.quizAvgScore /= perf.quizAttempts;
      }
    });

    // Adicionar flashcards ao mapa
    flashcardReviews?.forEach(review => {
      if (!topicPerformance.has(review.topic)) {
        topicPerformance.set(review.topic, {
          topic: review.topic,
          quizAttempts: 0,
          quizAvgScore: 0,
          flashcardReviews: 0,
          flashcardAvgScore: 0
        });
      }
      const perf = topicPerformance.get(review.topic);
      perf.flashcardReviews++;
      perf.flashcardAvgScore += review.percentage || 0;
    });

    // Calcular médias de flashcard
    topicPerformance.forEach(perf => {
      if (perf.flashcardReviews > 0) {
        perf.flashcardAvgScore /= perf.flashcardReviews;
      }
    });

    // 4️⃣ Identificar tópicos com dificuldade
    const weakTopics = Array.from(topicPerformance.values())
      .filter(perf => 
        (perf.quizAvgScore > 0 && perf.quizAvgScore < 70) ||
        (perf.flashcardAvgScore > 0 && perf.flashcardAvgScore < 75)
      )
      .sort((a, b) => {
        const scoreA = Math.min(a.quizAvgScore || 100, a.flashcardAvgScore || 100);
        const scoreB = Math.min(b.quizAvgScore || 100, b.flashcardAvgScore || 100);
        return scoreA - scoreB;
      });

    console.log('📊 Tópicos com dificuldade:', weakTopics.length);

    // 5️⃣ Desativar recomendações antigas
    await supabase
      .from('recommendations')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // 6️⃣ Criar novas recomendações
    const recommendations = [];

    // Recomendação de alta prioridade: Tópico com pior desempenho
    if (weakTopics.length > 0) {
      const worstTopic = weakTopics[0];
      recommendations.push({
        user_id: user.id,
        title: 'Revisar Tópico com Dificuldade',
        description: `Você teve ${worstTopic.quizAvgScore.toFixed(0)}% de acerto em "${worstTopic.topic}". Que tal revisar?`,
        priority: 'high',
        action_route: '/aichat',
        is_active: true
      });
    }

    // Recomendação média: Flashcards não revisados recentemente
    const { count: unreviewedFlashcards } = await supabase
      .from('generated_flashcard_sets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (unreviewedFlashcards && unreviewedFlashcards > 0 && recommendations.length === 0) {
      recommendations.push({
        user_id: user.id,
        title: 'Flashcards Aguardando Revisão',
        description: `Você tem ${unreviewedFlashcards} conjuntos de flashcards prontos para revisar!`,
        priority: 'medium',
        action_route: '/review',
        is_active: true
      });
    }

    // Recomendação baixa: Explorar novo conteúdo
    if (recommendations.length === 0) {
      recommendations.push({
        user_id: user.id,
        title: 'Continue Explorando!',
        description: 'Você está indo muito bem! Que tal explorar novos tópicos com a Mia?',
        priority: 'low',
        action_route: '/aichat',
        is_active: true
      });
    }

    // Inserir apenas a recomendação de maior prioridade
    if (recommendations.length > 0) {
      const { error: insertError } = await supabase
        .from('recommendations')
        .insert(recommendations[0]);

      if (insertError) throw insertError;
    }

    console.log('✅ Recomendações geradas:', recommendations.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendationsCreated: recommendations.length,
        weakTopics: weakTopics.map(t => t.topic)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao gerar recomendações:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
