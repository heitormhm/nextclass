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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting event notification job...');

    // Get current date and 24 hours from now
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch personal events with notifications enabled in next 24h
    const { data: personalEvents, error: personalError } = await supabase
      .from('personal_events')
      .select('*, users!inner(email, full_name)')
      .gte('event_date', now.toISOString())
      .lte('event_date', tomorrow.toISOString())
      .or('notification_email.eq.true,notification_platform.eq.true');

    if (personalError) {
      console.error('Error fetching personal events:', personalError);
      throw personalError;
    }

    console.log(`Found ${personalEvents?.length || 0} personal events`);

    // Process notifications for each event
    for (const event of personalEvents || []) {
      const eventDate = new Date(event.event_date);
      const formattedDate = eventDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      // Create in-platform notification if enabled
      if (event.notification_platform) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: event.user_id,
            title: `Lembrete: ${event.title}`,
            message: `Seu evento "${event.title}" está agendado para ${formattedDate} às ${event.start_time}`,
            event_id: event.id,
            event_type: 'personal',
            is_read: false
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
        } else {
          console.log(`Created platform notification for event ${event.id}`);
        }
      }

      // Send email notification if enabled (would require Resend setup)
      if (event.notification_email) {
        console.log(`Email notification needed for event ${event.id} to ${event.users.email}`);
        // TODO: Integrate with Resend when API key is available
        // const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
        // await resend.emails.send({...});
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: personalEvents?.length || 0,
        message: 'Event notifications processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-event-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
