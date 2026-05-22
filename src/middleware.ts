import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// API routes that don't require authentication
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/register',
  '/api/health',
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Allow public API paths through
  if (PUBLIC_API_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('harmony_token')?.value;

  if (!token) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);

    const res = NextResponse.next();
    res.headers.set('x-user-id',    String(payload.userId));
    res.headers.set('x-user-email', String(payload.email));
    addSecurityHeaders(res);
    return res;
  } catch {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

function addSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/chat/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/journal/:path*',
    '/resources/:path*',
    '/progress/:path*',
  ],
};
