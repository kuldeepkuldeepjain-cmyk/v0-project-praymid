import { NextResponse } from "next/server"

export async function GET() {
  const checks = {
    database: {
      databaseUrl: !!process.env.DATABASE_URL,
    },
    features: {
      qstashToken: !!process.env.QSTASH_TOKEN,
      appUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      cronSecret: !!process.env.CRON_SECRET,
    },
    optional: {
      otpApiKey: !!process.env.OTP_API_KEY,
      otpSenderId: !!process.env.OTP_SENDER_ID,
      otpTemplateId: !!process.env.OTP_TEMPLATE_ID,
    },
  }

  const isHealthy =
    checks.database.databaseUrl &&
    checks.features.cronSecret

  const hasAutoMatch = checks.features.qstashToken && checks.features.appUrl

  return NextResponse.json({
    status: isHealthy ? "healthy" : "configuration_required",
    timestamp: new Date().toISOString(),
    requirements: {
      database: {
        configured: checks.database.databaseUrl,
        details: {
          databaseUrl: checks.database.databaseUrl ? "✓" : "✗ MISSING",
        },
      },
      features: {
        cronScheduling: {
          configured: checks.features.cronSecret,
          details: checks.features.cronSecret ? "✓ Daily payout matching enabled" : "✗ MISSING CRON_SECRET",
        },
        autoMatchContributions: {
          configured: hasAutoMatch,
          details: hasAutoMatch
            ? "✓ 30-minute auto-match enabled"
            : `✗ Missing: ${!checks.features.qstashToken ? "QSTASH_TOKEN " : ""}${!checks.features.appUrl ? "NEXT_PUBLIC_APP_URL" : ""}`,
        },
      },
      optional: {
        smsOtp: {
          configured: checks.optional.otpApiKey && checks.optional.otpSenderId,
          details: checks.optional.otpApiKey ? "✓ SMS OTP available" : "○ Not configured",
        },
      },
    },
    missingSetting: {
      critical: [
        !checks.database.databaseUrl && "DATABASE_URL",
        !checks.features.cronSecret && "CRON_SECRET",
      ].filter(Boolean),
      recommended: [
        !checks.features.qstashToken && "QSTASH_TOKEN (for 30-min auto-match)",
        !checks.features.appUrl && "NEXT_PUBLIC_APP_URL (for auto-match scheduler)",
      ].filter(Boolean),
    },
    nextSteps:
      isHealthy && hasAutoMatch
        ? "All systems operational. Contribution auto-matching is enabled."
        : isHealthy
          ? "Database configured. Add QSTASH_TOKEN and NEXT_PUBLIC_APP_URL for 30-minute auto-match feature."
          : "Please configure missing environment variables in Vercel Settings.",
  })
}
