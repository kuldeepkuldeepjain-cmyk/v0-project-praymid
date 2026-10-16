import { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false
  let timer: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = async () => {
        if (closed) return
        try {
          const origin = new URL(request.url).origin
          const response = await fetch(`${origin}/api/forex/rates`, {
            cache: "no-store",
            headers: { "x-market-stream": "1" },
            signal: AbortSignal.timeout(8_000),
          })
          const payload = await response.json()
          if (response.ok && payload?.rates) {
            controller.enqueue(encoder.encode(`event: rates\ndata: ${JSON.stringify(payload)}\n\n`))
          } else {
            controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({ status: "stale", ts: Date.now() })}\n\n`))
          }
        } catch {
          controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({ status: "offline", ts: Date.now() })}\n\n`))
        }
      }
      controller.enqueue(encoder.encode(`: connected\n\n`))
      await send()
      timer = setInterval(() => void send(), 1_000)
    },
    cancel() {
      closed = true
      if (timer) clearInterval(timer)
    },
  })

  request.signal.addEventListener("abort", () => {
    closed = true
    if (timer) clearInterval(timer)
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
