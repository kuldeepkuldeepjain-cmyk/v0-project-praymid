import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  try {
    const { recipientType, recipientEmail, title, message, type } = await req.json()

    if (recipientType === "all") {
      const participants = await sql`SELECT email FROM participants`
      if (participants.length > 0) {
        for (const p of participants) {
          await sql`
            INSERT INTO notifications (user_email, title, message, type, read_status, created_at)
            VALUES (${p.email}, ${title}, ${message}, ${type}, false, NOW())
          `
        }
      }
      return NextResponse.json({ success: true, count: participants.length })
    } else {
      await sql`
        INSERT INTO notifications (user_email, title, message, type, read_status, created_at)
        VALUES (${recipientEmail}, ${title}, ${message}, ${type}, false, NOW())
      `
      return NextResponse.json({ success: true, count: 1 })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
