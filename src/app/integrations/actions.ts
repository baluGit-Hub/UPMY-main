"use server";

import { z } from "zod";
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { fetchWithJiraAuth } from '@/lib/jira-auth'; // Assuming jira-auth.ts is in src/lib

export interface IntegrationActionResponse {
  success: boolean;
  message: string;
  error?: string;
  redirectUrl?: string; // To send user to OAuth provider
}

// Simulate a delay to mimic an API call for non-Jira integrations
const simulateApiCall = () => new Promise(resolve => setTimeout(resolve, 1000));

const ConnectIntegrationSchema = z.object({
  integrationName: z.string(),
});

// Schema for Jira API Token connection form
const ConnectJiraApiTokenSchema = z.object({
  jiraEmail: z.string().email("Invalid email address."),
  jiraApiToken: z.string().min(1, "API Token is required."),
  // Ensure jiraSiteUrl starts with https:// and is a valid URL format
  jiraSiteUrl: z.string().url("Invalid Jira Site URL.").refine(url => url.startsWith("https://"), {
    message: "Jira Site URL must start with https://",
  }),
});

export async function connectJiraWithApiTokenAction(
  formData: FormData
): Promise<IntegrationActionResponse> {
  console.log('--- Attempting to connect Jira with API Token ---');
  
  const rawFormData = {
    jiraEmail: formData.get('jiraEmail'),
    jiraApiToken: formData.get('jiraApiToken'),
    jiraSiteUrl: formData.get('jiraSiteUrl'),
  };

  const validatedFields = ConnectJiraApiTokenSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    const errors = validatedFields.error.flatten().fieldErrors;
    console.error('Jira API Token connection: Validation failed', errors);
    // Construct a user-friendly error message string
    let errorMessage = "Validation failed: ";
    const errorMessages = Object.values(errors).flat();
    errorMessage += errorMessages.join("; ");
    
    return {
      success: false,
      message: errorMessage,
      error: JSON.stringify(errors), // Keep detailed error for potential client-side use
    };
  }

  const { jiraEmail, jiraApiToken, jiraSiteUrl } = validatedFields.data;

  const cookieStore = await cookies();
  const cookieOptions = { 
    httpOnly: true, 
    secure: process.env.NODE_ENV !== 'development', 
    path: '/', 
    sameSite: 'lax' as const, 
    maxAge: 365 * 24 * 60 * 60 // 1 year
  };

  cookieStore.set('jira_api_email', jiraEmail, cookieOptions);
  cookieStore.set('jira_api_token', jiraApiToken, cookieOptions);
  cookieStore.set('jira_site_url', jiraSiteUrl, cookieOptions);
  cookieStore.set('jira_auth_method', 'api_token', cookieOptions);
  
  cookieStore.delete('jira_access_token');
  cookieStore.delete('jira_refresh_token');
  cookieStore.delete('jira_oauth_state');
  cookieStore.delete('jira_connected_status'); 
  
  console.log('Jira API Token credentials and site URL saved to cookies.');
  return {
    success: true,
    message: "Jira connected successfully using API Token. You may need to refresh the page to see updated data.",
  };
}


export async function connectIntegrationAction(
  formData: FormData
): Promise<IntegrationActionResponse> {
  console.log('--- Starting Integration Connection (connectIntegrationAction) ---');
  const validatedFields = ConnectIntegrationSchema.safeParse({
    integrationName: formData.get("integrationName"),
  });

  if (!validatedFields.success) {
    console.error('Validation failed:', validatedFields.error.flatten());
    return {
      success: false,
      message: "Validation failed.",
      error: validatedFields.error.flatten().fieldErrors.integrationName?.join(" "),
    };
  }

  const { integrationName } = validatedFields.data;
  console.log('Connecting integration:', integrationName);

  if (integrationName === "Jira") {
    console.warn('connectIntegrationAction called for Jira, but API Token method is active. Please use the API Token submission form.');
    return {
      success: false,
      message: "Jira connection via API Token requires manual input. OAuth flow is temporarily disabled.",
      error: "Please use the form to provide your Jira Email, API Token, and Site URL.",
    };
  } 
  
  else { 
    await simulateApiCall();
    console.log(`Simulating connection to ${integrationName}`);
    return {
      success: true,
      message: `Successfully initiated connection process for ${integrationName}.`,
    };
  }
}

const DisconnectIntegrationSchema = z.object({
  integrationName: z.string(),
});

export async function disconnectIntegrationAction(
  formData: FormData
): Promise<IntegrationActionResponse> {
  const validatedFields = DisconnectIntegrationSchema.safeParse({
    integrationName: formData.get("integrationName"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed.",
      error: validatedFields.error.flatten().fieldErrors.integrationName?.join(" "),
    };
  }

  const { integrationName } = validatedFields.data;

  if (integrationName === "Jira") {
    const cookieStore = await cookies();
    await cookieStore.delete('jira_oauth_state'); 
    await cookieStore.delete('jira_access_token');
    await cookieStore.delete('jira_refresh_token');
    await cookieStore.delete('jira_connected_status');
    
    await cookieStore.delete('jira_api_email');
    await cookieStore.delete('jira_api_token');
    await cookieStore.delete('jira_site_url');
    await cookieStore.delete('jira_auth_method');
    console.log("Jira OAuth and API Token cookies cleared.");
  }

  await simulateApiCall(); 
  console.log(`Simulating disconnection from ${integrationName}`);
  return {
    success: true,
    message: `Successfully initiated disconnection process for ${integrationName}.`,
  };
}

// --- Jira Webhook Actions ---

export interface JiraWebhook {
  id: number;
  name?: string; // Name is not directly on the webhook object from /rest/api/3/webhook, but often part of payload for create
  jqlFilter: string;
  events: string[];
  // self?: string; // URL to the webhook itself
  // lastUpdated?: number;
  // lastUpdatedDisplayName?: string;
  enabled?: boolean; // Not directly in the list view, but part of webhook details
  url?: string; // The webhook callback URL - this is in the payload for create, not list
}

export interface ListWebhooksResponse {
  success: boolean;
  webhooks?: JiraWebhook[]; // Using values from the Jira API response structure
  error?: string;
  message?: string;
}

export async function listJiraWebhooksAction(): Promise<ListWebhooksResponse> {
  console.log('--- Listing Jira Webhooks ---');
  const cookieStore = await cookies();
  const siteUrl = cookieStore.get('jira_site_url')?.value;
  const authMethod = cookieStore.get('jira_auth_method')?.value;

  if (authMethod !== 'api_token' || !siteUrl) {
    const errorMsg = "Jira not connected via API Token or site URL is missing.";
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const webhooksApiUrl = `${siteUrl}/rest/api/3/webhook`;

  try {
    console.log(`Fetching webhooks from: ${webhooksApiUrl}`);
    const response = await fetchWithJiraAuth(webhooksApiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `Failed to fetch Jira webhooks. Status: ${response.status}. Details: ${errorText}`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const data = await response.json();
    // The actual webhooks are in the "values" array from Jira's response
    const webhooksList: JiraWebhook[] = data.values || []; 
    console.log(`Successfully fetched ${webhooksList.length} webhooks.`);
    
    return {
      success: true,
      webhooks: webhooksList,
      message: `Successfully fetched ${webhooksList.length} webhooks.`,
    };

  } catch (error: any) {
    const errorMsg = `Unexpected error listing Jira webhooks: ${error.message}`;
    console.error(errorMsg, error);
    return { success: false, error: errorMsg };
  }
}
