import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

function getPool() {
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error("POSTGRES_URL is not configured")
  // Strip sslmode from the connection string so pg uses our explicit ssl config
  const cleanUrl = url.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "")
  return new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })
}

export async function POST(request: NextRequest) {
  const pool = getPool()
  try {
    const { mobile_number, otp_code } = await request.json()

    if (!mobile_number || !otp_code) {
      return NextResponse.json({ error: "Mobile number and OTP code are required" }, { status: 400 })
    }

    // Find valid OTP record
    const result = await pool.query(
      `SELECT * FROM mobile_verification_otps
       WHERE mobile_number = $1
         AND is_verified = false
         AND expires_at > NOW()
       LIMIT 1`,
      [mobile_number]
    )

    const otpRecord = result.rows[0]
    if (!otpRecord) {
      return NextResponse.json(
        { error: "OTP expired or not found. Please request a new OTP." },
        { status: 400 }
      )
    }

    if (otpRecord.otp_code !== otp_code) {
      const newCount = otpRecord.attempt_count + 1
      await pool.query(
        "UPDATE mobile_verification_otps SET attempt_count = $1 WHERE id = $2",
        [newCount, otpRecord.id]
      )
      const remaining = 5 - newCount
      if (remaining <= 0) {
        return NextResponse.json(
          { error: "Maximum OTP verification attempts exceeded. Request a new OTP." },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: "Incorrect OTP", message: `You have ${remaining} attempts remaining` },
        { status: 400 }
      )
    }

    // Mark as verified
    await pool.query(
      "UPDATE mobile_verification_otps SET is_verified = true, verified_at = NOW() WHERE id = $1",
      [otpRecord.id]
    )

    return NextResponse.json(
      { success: true, message: "Mobile number verified successfully", mobile_number },
      { status: 200 }
    )
  } catch (error) {
    console.error("[verify-otp] Error:", error)
    return NextResponse.json({ error: "An error occurred while verifying OTP" }, { status: 500 })
  } finally {
    await pool.end()
  }
}
