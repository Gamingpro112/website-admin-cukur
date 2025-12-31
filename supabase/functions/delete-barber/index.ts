import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Check if user is owner
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role !== 'owner') {
      throw new Error('Only owners can delete barber accounts')
    }

    // Get request body
    const { barber_id } = await req.json()

    if (!barber_id) {
      throw new Error('Barber ID is required')
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Delete user_roles entry first (this prevents the user from logging in)
    const { error: roleDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', barber_id)

    if (roleDeleteError) {
      console.error('Error deleting user role:', roleDeleteError)
    }

    // Delete from barbers table (cascade will remove related transactions, salaries, schedules)
    const { error: barberDeleteError } = await supabaseAdmin
      .from('barbers')
      .delete()
      .eq('id', barber_id)

    if (barberDeleteError) {
      throw barberDeleteError
    }

    // Delete auth user to completely remove credentials
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(barber_id)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      // Don't throw - barber is already deleted from business tables
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
