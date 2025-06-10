import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  console.log('--- Jira OAuth Callback Handler Started ---');
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Log important parameters
  console.log('Received state:', state);
  console.log('Received authorization code:', code ? `${code.substring(0, 10)}...` : 'missing');
  console.log('Current NODE_ENV:', process.env.NODE_ENV);

  const cookieStore = await cookies();
  const storedState = cookieStore.get('jira_oauth_state')?.value;
  console.log('Stored state from cookie:', storedState);

  if (!state || state !== storedState) {
    console.error('Jira OAuth callback state mismatch or missing state.');
    console.log('Received state:', state);
    console.log('Stored state:', storedState);
    const integrationsUrl = new URL('/integrations', request.nextUrl.origin);
    integrationsUrl.searchParams.set('jira_error', 'state_mismatch');
    
    const errorResponse = NextResponse.redirect(integrationsUrl);
    // Clear the state cookie, matching its original attributes
    errorResponse.cookies.set({
        name: 'jira_oauth_state',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: -1, 
        path: '/',
        sameSite: 'lax',
    });
    return errorResponse;
  }

  if (!code) {
    console.error('Jira OAuth callback missing authorization code.');
    const integrationsUrl = new URL('/integrations', request.nextUrl.origin);
    integrationsUrl.searchParams.set('jira_error', 'missing_code');
    
    const errorResponse = NextResponse.redirect(integrationsUrl);
    // Clear the state cookie, matching its original attributes
    errorResponse.cookies.set({
        name: 'jira_oauth_state',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: -1,
        path: '/',
        sameSite: 'lax',
    });
    return errorResponse;
  }

  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;
  const redirectUri = process.env.JIRA_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing required environment variables in callback handler');
    const integrationsUrl = new URL('/integrations', request.nextUrl.origin);
    integrationsUrl.searchParams.set('jira_error', 'config_error');
    return NextResponse.redirect(integrationsUrl);
  }

  try {
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      const integrationsUrl = new URL('/integrations', request.nextUrl.origin);
      integrationsUrl.searchParams.set('jira_error', 'token_exchange_failed');
      return NextResponse.redirect(integrationsUrl);
    }

    const tokens = await tokenResponse.json();
    console.log('Token exchange successful');
    console.log('Access token received:', !!tokens.access_token);
    console.log('Refresh token received:', !!tokens.refresh_token);
    console.log('Token expires in:', tokens.expires_in, 'seconds');

    const response = NextResponse.redirect(new URL('/integrations', request.nextUrl.origin));

    // Set the access token cookie
    response.cookies.set({
      name: 'jira_access_token',
      value: tokens.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: tokens.expires_in,
      path: '/',
      sameSite: 'lax',
    });

    // Set the refresh token cookie if we received one
    if (tokens.refresh_token) {
      response.cookies.set({
        name: 'jira_refresh_token',
        value: tokens.refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        sameSite: 'lax',
      });
    }

    // Clear the state cookie as it's no longer needed, matching its original attributes
    response.cookies.set({
      name: 'jira_oauth_state',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: -1,
      path: '/',
      sameSite: 'lax', // Ensure all attributes used for setting are used for deletion
    });

    return response;
  } catch (error) {
    console.error('Error during token exchange:', error);
    const integrationsUrl = new URL('/integrations', request.nextUrl.origin);
    integrationsUrl.searchParams.set('jira_error', 'unexpected_error');
    return NextResponse.redirect(integrationsUrl);
  }
}
