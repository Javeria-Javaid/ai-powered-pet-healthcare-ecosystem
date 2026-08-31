import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/db';
import { generateSessionToken, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Google credential is required.' } },
        { status: 400 }
      );
    }

    let email = '';
    let firstName = 'Google';
    let lastName = 'User';

    // Enable mock verification in development/testing environments
    if (process.env.NODE_ENV === 'development' && credential.startsWith('mock_google_token_')) {
      const parts = credential.split('_');
      // format: mock_google_token_email_firstName_lastName
      email = parts[3] || 'mock@example.com';
      firstName = parts[4] || 'Mock';
      lastName = parts[5] || 'User';
    } else {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Google client ID is not configured.' } },
          { status: 500 }
        );
      }

      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token payload.' } },
          { status: 401 }
        );
      }

      email = payload.email;
      firstName = payload.given_name || 'Google';
      lastName = payload.family_name || 'User';
    }

    // 1. Locate or insert user in database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          role: 'PET_OWNER', // Default to PET_OWNER
        },
      });
    }

    // 2. Create session
    const sessionToken = generateSessionToken();
    const session = await createSession(user.id, sessionToken);

    // 3. Set cookie
    await setSessionCookie(sessionToken, session.expiresAt);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });

  } catch (err: any) {
    console.error('Google OAuth callback error:', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication failed.' } },
      { status: 401 }
    );
  }
}
