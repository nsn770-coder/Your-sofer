import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none')
  response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none')
  return response
}

export const config = {
  matcher: '/(.*)',
}
