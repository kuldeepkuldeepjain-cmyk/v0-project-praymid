#!/usr/bin/env node

async function deleteParticipants() {
  try {
    console.log('[v0] Starting participant deletion...')

    // Get the base URL - default to localhost for development
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

    console.log(`[v0] Calling deletion API at: ${baseUrl}/api/admin/delete-all-participants-except`)

    const response = await fetch(`${baseUrl}/api/admin/delete-all-participants-except`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[v0] API Error:', response.status, errorData)
      process.exit(1)
    }

    const result = await response.json()
    console.log('[v0] Deletion completed successfully!')
    console.log('Result:', result)
    process.exit(0)
  } catch (error) {
    console.error('[v0] Error:', error)
    process.exit(1)
  }
}

deleteParticipants()
