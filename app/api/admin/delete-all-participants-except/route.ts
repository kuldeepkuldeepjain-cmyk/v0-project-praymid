import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  // Requires super_admin role — most destructive operation
  const auth = await requireAdminSession(request, true)
  if (!auth.ok) return auth.response

  try {
    const supabase = await createClient()

    const PROTECTED_EMAIL = 'kuldeepkuldeepjain@gmail.com'

    console.log(`[v0] Starting deletion of all participants except ${PROTECTED_EMAIL}`)

    // Step 1: Get the protected participant ID
    const { data: protectedParticipant, error: fetchError } = await supabase
      .from('participants')
      .select('id, email')
      .eq('email', PROTECTED_EMAIL)
      .maybeSingle()

    if (fetchError) {
      console.error('[v0] Error fetching protected participant:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch protected participant' }, { status: 500 })
    }

    if (!protectedParticipant) {
      console.error(`[v0] Protected participant ${PROTECTED_EMAIL} not found`)
      return NextResponse.json({ error: 'Protected participant not found' }, { status: 404 })
    }

    console.log(`[v0] Protected participant found: ${protectedParticipant.id}`)

    // Step 2: Get all other participant IDs
    const { data: allParticipants, error: listError } = await supabase
      .from('participants')
      .select('id, email')

    if (listError) {
      console.error('[v0] Error fetching participants:', listError)
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
    }

    const participantsToDelete = allParticipants.filter((p: any) => p.email !== PROTECTED_EMAIL)

    console.log(`[v0] Found ${participantsToDelete.length} participants to delete`)

    if (participantsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No participants to delete',
        deletedCount: 0,
      })
    }

    const participantIdsToDelete = participantsToDelete.map((p: any) => p.id)

    // Step 3: Delete related records in order (respecting foreign keys)
    const deletionSteps = [
      { table: 'transactions', column: 'participant_id' },
      { table: 'payment_submissions', column: 'participant_id' },
      { table: 'payout_requests', column: 'participant_id' },
      { table: 'predictions', column: 'participant_id' },
      { table: 'topup_requests', column: 'participant_id' },
      { table: 'wallet_pool', column: 'assigned_to' },
      { table: 'notifications', column: 'user_id' },
      { table: 'activity_logs', column: 'actor_id' },
      { table: 'p2p_transactions', column: 'sender_id' },
      { table: 'p2p_transactions', column: 'receiver_id' },
    ]

    let totalDeleted = 0

    for (const step of deletionSteps) {
      const column = step.column === 'participant_id' ? 'participant_id' : step.column
      
      const { error: deleteError, count } = await supabase
        .from(step.table)
        .delete()
        .in(column, participantIdsToDelete)

      if (deleteError) {
        console.warn(`[v0] Error deleting from ${step.table}:`, deleteError)
        // Continue with other tables even if one fails
      } else {
        console.log(`[v0] Deleted ${count || 0} records from ${step.table}`)
        totalDeleted += count || 0
      }
    }

    // Step 4: Delete the participants themselves
    const { error: participantDeleteError, count: participantCount } = await supabase
      .from('participants')
      .delete()
      .neq('email', PROTECTED_EMAIL)

    if (participantDeleteError) {
      console.error('[v0] Error deleting participants:', participantDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete participants', details: participantDeleteError.message },
        { status: 500 }
      )
    }

    console.log(`[v0] Successfully deleted ${participantCount} participants`)
    totalDeleted += participantCount || 0

    return NextResponse.json({
      success: true,
      message: `Successfully deleted all participants except ${PROTECTED_EMAIL}`,
      deletedParticipants: participantCount,
      relatedRecordsDeleted: totalDeleted,
      protectedEmail: PROTECTED_EMAIL,
    })
  } catch (error) {
    console.error('[v0] Error in deletion process:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
