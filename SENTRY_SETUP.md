# Sentry Error Monitoring Setup

## Overview
Sentry has been integrated into FlowChain for comprehensive error tracking and performance monitoring across the entire application.

## Installation

Add Sentry packages to your project:

```bash
npm install @sentry/nextjs --save
```

## Configuration

### 1. Environment Variables

Add the following to your `.env.local` file:

```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_VERCEL_ENV=development
```

To get your Sentry DSN:
1. Go to https://sentry.io
2. Create a new project or select existing project
3. Navigate to Settings → Projects → [Your Project] → Client Keys (DSN)
4. Copy the DSN value

### 2. Next.js Configuration

The following files have been created for Sentry integration:

- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking
- `instrumentation.ts` - Next.js instrumentation hook

### 3. Update next.config.mjs

Add Sentry webpack plugin (optional for source maps):

```javascript
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  // Your existing config
};

export default withSentryConfig(nextConfig, {
  org: "your-org-name",
  project: "your-project-name",
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
```

## Usage

### Basic Error Logging

```typescript
import { logError, logWarning } from '@/lib/monitoring'

try {
  // Your code
} catch (error) {
  logError(error, { context: 'additional info' })
}
```

### Track Custom Events

```typescript
import { trackEvent } from '@/lib/monitoring'

trackEvent('user_registered', {
  email: user.email,
  referralCode: code,
})
```

### Set User Context

```typescript
import { setUserContext, clearUserContext } from '@/lib/monitoring'

// On login
setUserContext({
  email: user.email,
  username: user.username,
  role: 'participant',
})

// On logout
clearUserContext()
```

### Performance Monitoring

```typescript
import { measurePerformance } from '@/lib/monitoring'

const result = await measurePerformance('fetchUserData', async () => {
  return await fetch('/api/user')
})
```

### Add Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/monitoring'

addBreadcrumb('User clicked submit button', {
  formData: sanitizedData,
})
```

## Features Enabled

### 1. Automatic Error Capture
- All unhandled exceptions are automatically captured
- React component errors caught by ErrorBoundary
- API route errors logged to Sentry

### 2. Performance Monitoring
- 100% transaction sampling for complete visibility
- Automatic performance tracking for:
  - Page loads
  - API calls
  - Database queries

### 3. Session Replay
- 10% of normal sessions recorded
- 100% of error sessions recorded
- Sensitive data masked automatically

### 4. User Context
- Automatically tracks user email, username, and role
- Helps identify which users are affected by issues

### 5. Error Filtering
- Network errors from ad blockers filtered out
- Console logs excluded from breadcrumbs
- Sensitive data sanitized

## Error Boundary

The ErrorBoundary component wraps the entire application and provides:
- User-friendly error messages
- Automatic error reporting to Sentry
- Recovery options (reload/go home)
- Development mode error details

## Monitoring Dashboard

After setup, monitor your application at:
https://sentry.io/organizations/[your-org]/issues/

### Key Metrics to Track:
1. **Error Rate** - Number of errors per user session
2. **Performance** - Page load times and API response times
3. **User Impact** - How many users are affected by each issue
4. **Release Health** - Track issues by deployment

## Integration with Existing Code

### API Routes Example

```typescript
// app/api/participant/predictions/route.ts
import { logError } from '@/lib/monitoring'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: Request) {
  const transaction = Sentry.startTransaction({
    name: 'Create Prediction',
    op: 'api.prediction.create',
  })

  try {
    // Your existing code
    const data = await request.json()
    
    // Business logic
    const result = await createPrediction(data)
    
    transaction.setStatus('ok')
    return Response.json({ success: true, data: result })
  } catch (error) {
    transaction.setStatus('internal_error')
    logError(error, { 
      endpoint: '/api/participant/predictions',
      method: 'POST' 
    })
    return Response.json({ error: 'Failed to create prediction' }, { status: 500 })
  } finally {
    transaction.finish()
  }
}
```

### Client Components Example

```typescript
'use client'

import { useEffect } from 'react'
import { setUserContext, addBreadcrumb, logError } from '@/lib/monitoring'

export default function ProfilePage() {
  useEffect(() => {
    const userData = localStorage.getItem('participantData')
    if (userData) {
      const user = JSON.parse(userData)
      setUserContext({
        email: user.email,
        username: user.username,
        role: 'participant',
      })
      
      addBreadcrumb('Viewed profile page', { userId: user.email })
    }
  }, [])

  const handleSubmit = async (data) => {
    try {
      addBreadcrumb('Profile update submitted', { fields: Object.keys(data) })
      await updateProfile(data)
    } catch (error) {
      logError(error, { component: 'ProfilePage', action: 'updateProfile' })
    }
  }

  return <div>Profile Content</div>
}
```

## Testing

To test Sentry integration:

```typescript
// Test error capture
throw new Error('Test Sentry Error')

// Test with context
import { logError } from '@/lib/monitoring'
logError(new Error('Test with context'), { test: true })
```

## Production Checklist

- [ ] Sentry DSN configured in production environment variables
- [ ] Error boundary tested with intentional errors
- [ ] User context being set on authentication
- [ ] Performance monitoring enabled
- [ ] Source maps uploaded (if using withSentryConfig)
- [ ] Alert rules configured in Sentry dashboard
- [ ] Team notifications set up

## Support

For issues with Sentry integration:
1. Check Sentry dashboard for configuration errors
2. Verify environment variables are set correctly
3. Review browser console for Sentry initialization errors
4. Contact Sentry support: https://sentry.io/support/

## Additional Resources

- Sentry Next.js Documentation: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Performance Monitoring: https://docs.sentry.io/product/performance/
- Session Replay: https://docs.sentry.io/product/session-replay/
