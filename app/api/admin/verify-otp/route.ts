export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { participantId, otp, adminEmail } = await request.json()

    if (!participantId || !otp) {
      return NextResponse.json({ success: false, error: "Participant ID and OTP are required" }, { status: 400 })
    }

    // Try password reset OTP first (participants table)
    const passwordResetRows = await query(
      `SELECT id, password_reset_otp, password_reset_otp_verified FROM participants WHERE id = $1 LIMIT 1`,
      [participantId]
    )

    if (passwordResetRows && passwordResetRows.length > 0) {
      const record = passwordResetRows[0] as any

      if (record.password_reset_otp) {
        if (record.password_reset_otp_verified) {
          return NextResponse.json({ success: false, error: "OTP already approved" }, { status: 400 })
        }

        if (record.password_reset_otp.trim() !== otp.trim()) {
          return NextResponse.json({ success: false, error: "Invalid OTP. Please check and try again." }, { status: 401 })
        }

        // Mark as approved
        await execute(
          `UPDATE participants SET password_reset_otp_verified = true WHERE id = $1`,
          [participantId]
        )

        await execute(
          `INSERT INTO audit_logs (action, description, admin_email) VALUES ($1, $2, $3)`,
          ["PASSWORD_RESET_OTP_APPROVED", `Password reset OTP approved`, adminEmail || "admin"]
        ).catch(() => {})

        return NextResponse.json({ success: true, message: "Password reset OTP approved. User can now change their password." })
      }
    }

    // Fall back to registration OTP (participants table)
    const registrationRows = await query(
      `SELECT id, full_name, email, whatsapp_otp, otp_verified FROM participants WHERE id = $1 LIMIT 1`,
      [participantId]
    )

    if (!registrationRows || registrationRows.length === 0) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    const participant = registrationRows[0] as any

    if (participant.otp_verified) {
      return NextResponse.json({ success: false, error: "OTP already verified" }, { status: 400 })
    }

    if (!participant.whatsapp_otp) {
      return NextResponse.json({ success: false, error: "No OTP found" }, { status: 400 })
    }

    if (participant.whatsapp_otp.trim() !== otp.trim()) {
      return NextResponse.json({ success: false, error: "Invalid OTP. Please check and try again." }, { status: 401 })
    }

    // Mark as verified
    await execute(
      `UPDATE participants SET otp_verified = true, otp_verified_at = NOW(), otp_verified_by = $1 WHERE id = $2`,
      [adminEmail || "admin", participantId]
    )

    await execute(
      `INSERT INTO audit_logs (action, description, admin_email) VALUES ($1, $2, $3)`,
      ["OTP_VERIFIED", `Registration OTP verified for ${participant.email}`, adminEmail || "admin"]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `OTP verified for ${participant.full_name || participant.email}`
    })
  } catch (error: any) {
    console.error("[verify-otp] Error:", error.message || error)
    return NextResponse.json({ success: false, error: error.message || "Verification failed" }, { status: 500 })
  }
}
