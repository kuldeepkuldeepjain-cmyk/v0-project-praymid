import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient()
    
    // Fetch real payment submissions with participant details
    const { data: payments, error: paymentsError } = await supabase
      .from("payment_submissions")
      .select(`
        *,
        participants:participant_id (
          username,
          wallet_address
        )
      `)
      .order("created_at", { ascending: false })

    if (paymentsError) {
      console.error("Error fetching payment submissions:", paymentsError)
      return NextResponse.json({ success: false, error: paymentsError.message }, { status: 500 })
    }

    // Transform data to match expected interface
    const transformedPayments = (payments || []).map((payment: any) => ({
      id: payment.id,
      email: payment.participant_email,
      username: payment.participants?.username || payment.participant_email?.split("@")[0] || "Unknown",
      wallet: payment.participants?.wallet_address || "",
      amount: Number(payment.amount) || 100,
      paymentMethod: payment.payment_method === "BEP20" ? "crypto" : "bank",
      screenshotUrl: payment.screenshot_url || "",
      transactionHash: payment.transaction_id || "",
      submittedAt: payment.created_at,
      status: payment.status || "pending",
    }))

    // Calculate stats (include request_pending as pending)
    const pendingCount = transformedPayments.filter((p) => p.status === "pending" || p.status === "request_pending").length
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const approvedToday = transformedPayments.filter(
      (p) => p.status === "approved" && new Date(p.submittedAt) >= today
    ).length
    
    const rejectedToday = transformedPayments.filter(
      (p) => p.status === "rejected" && new Date(p.submittedAt) >= today
    ).length
    
    const totalCollected = transformedPayments
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + p.amount, 0)



    return NextResponse.json({
      success: true,
      payments: transformedPayments,
      stats: {
        pending: pendingCount,
        approved_today: approvedToday,
        rejected_today: rejectedToday,
        total_collected: totalCollected,
      },
    })
  } catch (error) {
    console.error("Error in activation payments GET:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient()
    const { paymentId, action, reason } = await request.json()

    if (!paymentId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }



    // Get the payment submission first
    const { data: payment, error: paymentError } = await supabase
      .from("payment_submissions")
      .select("*")
      .eq("id", paymentId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 })
    }

    // STRICT DUPLICATE PREVENTION - Double-check status before ANY processing
    if (payment.status !== "pending" && payment.status !== "request_pending") {

      return NextResponse.json({ 
        success: false, 
        error: "This payment has already been processed. Duplicate action prevented.",
        currentStatus: payment.status,
        alreadyProcessed: true
      }, { status: 400 })
    }

    // Atomic status update with WHERE clause to prevent race conditions
    const { error: updatePaymentError, count } = await supabase
      .from("payment_submissions")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        rejection_reason: action === "reject" ? reason : null,
      })
      .eq("id", paymentId)
      .in("status", ["pending", "request_pending"]) // Only update if still pending

    // If no rows updated, another request already processed it
    if (count === 0) {

      return NextResponse.json({ 
        success: false, 
        error: "Payment was already processed by another request",
        alreadyProcessed: true
      }, { status: 409 })
    }

    if (updatePaymentError) {
      console.error("Error updating payment:", updatePaymentError)
      return NextResponse.json({ success: false, error: updatePaymentError.message }, { status: 500 })
    }

      // If approved, update participant's activation status and add $150 to account
    if (action === "approve") {
      // Get current balance
      const { data: participant, error: fetchError } = await supabase
        .from("participants")
        .select("account_balance")
        .eq("email", payment.participant_email)
        .single()

      if (fetchError) {
        console.error("Error fetching participant balance:", fetchError)
      }

      const currentBalance = participant?.account_balance || 0
      const newBalance = Number(currentBalance) + 150
      
      // Set next contribution date to 30 days from now
      const nextContributionDate = new Date()
      nextContributionDate.setDate(nextContributionDate.getDate() + 30)

      const { error: participantError } = await supabase
        .from("participants")
        .update({
          status: "active",
          is_active: true,
          activation_date: new Date().toISOString(),
          account_balance: newBalance,
          next_contribution_date: nextContributionDate.toISOString(),
        })
        .eq("email", payment.participant_email)

      if (participantError) {
        console.error("Error updating participant:", participantError)
      }

      // Create notification for user
      if (payment.participant_email) {
        await supabase.from("notifications").insert({
          user_email: payment.participant_email,
          type: "success",
          title: "Activation Approved",
          message: "Your contribution has been approved. $150 has been credited to your account. Next contribution available after 30 days.",
          read_status: false,
        })
      }
    } else {
      // On rejection: also set 30-day cooldown
      const nextContributionDate = new Date()
      nextContributionDate.setDate(nextContributionDate.getDate() + 30)
      
      await supabase
        .from("participants")
        .update({
          next_contribution_date: nextContributionDate.toISOString(),
        })
        .eq("email", payment.participant_email)
      
      // Create rejection notification
      if (payment.participant_email) {
        await supabase.from("notifications").insert({
          user_email: payment.participant_email,
          type: "error",
          title: "Activation Payment Rejected",
          message: (reason || "Your activation payment was rejected") + ". You can try again after 30 days.",
          read_status: false,
        })
      }
    }

    // Create audit log
    await supabase.from("activity_logs").insert({
      actor_email: "admin@123",
      action: action === "approve" ? "activation_approved" : "activation_rejected",
      target_type: "payment_submission",
      details: JSON.stringify({ paymentId, reason }),
    })

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Payment approved, account activated" : "Payment rejected",
    })
  } catch (error) {
    console.error("Activation action error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
