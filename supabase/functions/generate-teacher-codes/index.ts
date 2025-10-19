import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateCode(): string {
  const prefix = 'TEACH-AFYA';
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${randomPart}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    // Verificar se o usuário tem role de admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.log(`🚫 Unauthorized code generation attempt by ${user.email} (role: ${roleData?.role})`);
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem gerar códigos.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { quantity = 10, expiresInDays = null, notes = '' } = await req.json();

    if (quantity < 1 || quantity > 100) {
      return new Response(
        JSON.stringify({ error: 'Quantidade deve ser entre 1 e 100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const batchId = crypto.randomUUID();
    const codes: any[] = [];
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    console.log(`🔧 Generating ${quantity} codes for batch ${batchId}`);

    for (let i = 0; i < quantity; i++) {
      let code = generateCode();
      
      let attempts = 0;
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from('teacher_access_codes')
          .select('id')
          .eq('code', code)
          .maybeSingle();
        
        if (!existing) break;
        code = generateCode();
        attempts++;
      }

      codes.push({
        code,
        created_by_admin_id: user.id,
        batch_id: batchId,
        expires_at: expiresAt,
        notes: notes || `Lote gerado em ${new Date().toLocaleDateString('pt-BR')}`
      });
    }

    const { data: insertedCodes, error: insertError } = await supabase
      .from('teacher_access_codes')
      .insert(codes)
      .select();

    if (insertError) {
      console.error('Error inserting codes:', insertError);
      throw insertError;
    }

    console.log(`✅ Admin ${user.email} generated ${quantity} codes (batch: ${batchId})`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${quantity} códigos gerados com sucesso`,
        batch_id: batchId,
        codes: insertedCodes?.map(c => ({
          code: c.code,
          expires_at: c.expires_at
        }))
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error generating teacher codes:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao gerar códigos' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
