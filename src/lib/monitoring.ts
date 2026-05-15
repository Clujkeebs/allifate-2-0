import posthog from 'posthog-js'
import * as Sentry from '@sentry/react'

export function initMonitoring() {
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN
  const isProd = import.meta.env.PROD

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
      loaded: (ph) => {
        if (!isProd) ph.opt_out_capturing()
      },
    })
  }

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: isProd ? 'production' : 'development',
      tracesSampleRate: isProd ? 0.1 : 0,
      replaysSessionSampleRate: 0,
    })
  }
}

export function identifyUser(userId: string, email?: string) {
  posthog.identify(userId, { email })
}

export function resetUser() {
  posthog.reset()
}

export function track(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties)
}

// Key funnel events
export const Events = {
  SIGNUP: 'signup',
  LOGIN: 'login',
  CONNECT_PLATFORM: 'connect_platform',
  DISCONNECT_PLATFORM: 'disconnect_platform',
  GENERATE_CONTENT: 'generate_content',
  APPROVE_POST: 'approve_post',
  SCHEDULE_POST: 'schedule_post',
  START_CHECKOUT: 'start_checkout',
  CHECKOUT_SUCCESS: 'checkout_success',
  OPEN_BILLING_PORTAL: 'open_billing_portal',
} as const
