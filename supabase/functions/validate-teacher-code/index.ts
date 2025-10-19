import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { code } = await req.json();
    
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Código inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Validating code for user ${user.email}: ${code}`);

    const { data: codeData, error: codeError } = await supabase
      .from('teacher_access_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .maybeSingle();

    if (codeError || !codeData) {
      console.log(`❌ Code not found: ${code}`);
      return new Response(
        JSON.stringify({ error: 'Código não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (codeData.is_used) {
      console.log(`⚠️ Code already used: ${code}`);
      return new Response(
        JSON.stringify({ 
          error: 'Este código já foi utilizado',
          used_at: codeData.used_at,
          used_by: codeData.used_by_teacher_id
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      console.log(`⏰ Code expired: ${code}`);
      return new Response(
        JSON.stringify({ error: 'Este código expirou' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateCodeError } = await supabase
      .from('teacher_access_codes')
      .update({
        is_used: true,
        used_by_teacher_id: user.id,
        used_at: new Date().toISOString()
      })
      .eq('id', codeData.id);

    if (updateCodeError) {
      console.error('Error updating code:', updateCodeError);
      throw updateCodeError;
    }

    const { error: updateRoleError } = await supabase
      .from('user_roles')
      .update({
        is_validated: true,
        validated_at: new Date().toISOString(),
        validation_code_id: codeData.id
      })
      .eq('user_id', user.id);

    if (updateRoleError) {
      console.error('Error updating user role:', updateRoleError);
      throw updateRoleError;
    }

    console.log(`✅ Teacher ${user.email} validated with code ${code}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Código validado com sucesso! Bem-vindo ao sistema.',
        user_id: user.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error validating teacher code:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao validar código' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
