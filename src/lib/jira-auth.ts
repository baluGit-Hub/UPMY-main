import { cookies } from 'next/headers';

// TODO: Reinstate OAuth 2.0 (3LO) logic once external configuration issues are resolved.
// This file is temporarily modified to use Jira API Token (Basic Auth).

// Original TokenResponse interface (for OAuth 2.0) - kept for reference
// interface TokenResponse {
//   access_token: string;
//   refresh_token?: string;
//   expires_in: number;
// }

// Original refreshJiraToken function (for OAuth 2.0) - temporarily unused
/*
export async function refreshJiraToken(): Promise<TokenResponse | null> {
  // ... original OAuth refresh logic ...
}
*/

export async function fetchWithJiraAuth(url: string, options: RequestInit = {}) {
  console.log(`--- fetchWithJiraAuth (API Token Mode): ${url} ---`);
  const cookieStore = await cookies();
  const email = cookieStore.get('jira_api_email')?.value;
  const apiToken = cookieStore.get('jira_api_token')?.value;
  const authMethod = cookieStore.get('jira_auth_method')?.value;

  if (authMethod !== 'api_token' || !email || !apiToken) {
    console.error('fetchWithJiraAuth: Jira API Token credentials not found or auth method is not api_token. Please configure Jira connection via API Token.');
    // Simulating a 401 response as if the request was made unauthenticated
    return new Response(JSON.stringify({ error: "Client not configured for API token auth" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const basicAuth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  console.log(`fetchWithJiraAuth: Using Basic Auth with email: ${email.substring(0,3)}...`);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
      // Consider adding 'X-Atlassian-Token': 'no-check' if dealing with XSRF issues,
      // though typically not needed for API token auth with Basic.
    },
  });

  // With API token, a 401/403 usually means invalid token/email or insufficient permissions.
  // No refresh mechanism is available for API tokens.
  if (!response.ok) {
    // Log the error but return the response for the caller to handle.
    // This allows callers like getJiraProjectsAction to process specific errors.
    const errorText = await response.text().catch(() => "Could not retrieve error text");
    console.error(`fetchWithJiraAuth: API call to ${url} failed with status ${response.status}. Email: ${email.substring(0,3)}... Response: ${errorText.substring(0,100)}...`);
  } else {
    console.log(`fetchWithJiraAuth: API call to ${url} successful (status ${response.status})`);
  }

  return response;
}
