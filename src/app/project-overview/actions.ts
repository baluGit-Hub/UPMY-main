"use server";

import { cookies } from 'next/headers';
import { fetchWithJiraAuth } from '@/lib/jira-auth';

// Helper function to fetch analytics for a single project
async function getProjectAnalytics(
  projectKey: string, 
  siteUrl: string
): Promise<JiraProject["analytics"]> {
  const categories = {
    openIssues: '"To Do"',
    inProgressIssues: '"In Progress"', // This usually includes "In Review" status category in Jira
    doneIssues: '"Done"',
  };
  
  let counts: { openIssues: number; inProgressIssues: number; doneIssues: number; totalIssues: number } = {
    openIssues: 0,
    inProgressIssues: 0,
    doneIssues: 0,
    totalIssues: 0,
  };

  try {
    const categoryKeys = Object.keys(categories) as Array<keyof typeof categories>;
    for (const key of categoryKeys) {
      const statusCategoryValue = categories[key];
      const jql = `project = "${projectKey}" AND statusCategory = ${statusCategoryValue}`;
      const searchUrl = `${siteUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=0`;
      
      // console.log(`Analytics fetch for ${projectKey} (${key}): ${searchUrl}`);
      const response = await fetchWithJiraAuth(searchUrl);
      if (response.ok) {
        const result = await response.json();
        counts[key] = result.total || 0;
      } else {
        const errorText = await response.text().catch(() => "Could not retrieve error text");
        console.error(`Failed to fetch analytics for ${projectKey}, category ${statusCategoryValue}. Status: ${response.status}. Details: ${errorText.substring(0,100)}`);
      }
    }
    counts.totalIssues = counts.openIssues + counts.inProgressIssues + counts.doneIssues;
    return counts;
  } catch (error: any) {
    console.error(`Error fetching all analytics for project ${projectKey}: ${error.message}`, error);
    // Return zeroed counts on major error, or could return undefined to indicate failure
    return counts; 
  }
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
  avatarUrls?: {
    '48x48'?: string;
    '24x24'?: string;
    '16x16'?: string;
    '32x32'?: string;
  };
  analytics?: {
    totalIssues: number;
    openIssues: number;
    inProgressIssues: number;
    doneIssues: number;
  };
}

export interface JiraPermission {
  id: string;
  key: string;
  name: string;
  type: string;
  description?: string;
  havePermission: boolean;
}

export interface JiraPermissionsResponse {
  permissions: {
    [key: string]: JiraPermission;
  };
}

interface AccessibleResource {
  id: string; // This is the cloudId
  url: string; // e.g., https://your-domain.atlassian.net
  name: string;
  scopes: string[];
  avatarUrl: string;
}

export interface GetProjectsResponse {
  projects: JiraProject[];
  error?: string;
  source: 'live' | 'mock' | 'hardcoded_token'; // Added 'hardcoded_token'
  permissions?: JiraPermissionsResponse;
  accessibleResources?: AccessibleResource[];
  selectedResourceUrl?: string;
}

const mockProjects: JiraProject[] = [
  { id: "10001", key: "PROJA", name: "Project Alpha (Mock)", projectTypeKey: "software", avatarUrls: {'48x48': 'https://placehold.co/48x48/64B5F6/FFFFFF?text=PA'}, analytics: { totalIssues: 50, openIssues: 10, inProgressIssues: 5, doneIssues: 35} },
  { id: "10002", key: "PROJB", name: "Project Beta (Mock)", projectTypeKey: "business", avatarUrls: {'48x48': 'https://placehold.co/48x48/4DB6AC/FFFFFF?text=PB'}, analytics: { totalIssues: 120, openIssues: 30, inProgressIssues: 20, doneIssues: 70}},
  { id: "10003", key: "PROJC", name: "Project Gamma (Mock)", projectTypeKey: "service_desk", avatarUrls: {'48x48': 'https://placehold.co/48x48/FFB74D/FFFFFF?text=PC'}, analytics: { totalIssues: 75, openIssues: 15, inProgressIssues: 10, doneIssues: 50}},
];

const USE_HARDCODED_TOKEN_FOR_TESTING = false;
const HARDCODED_JIRA_ACCESS_TOKEN = "YOUR_TEMPORARY_JIRA_ACCESS_TOKEN_HERE";

export async function getJiraProjectsAction(): Promise<GetProjectsResponse> {
  console.log("--- getJiraProjectsAction ---");
  let currentSource: 'live' | 'mock' = 'mock';
  let apiErrorMessage = "";
  let selectedResourceUrl: string | undefined = undefined;
  // accessibleResources will be undefined in API token mode, as we don't fetch them.
  const accessibleResources: AccessibleResource[] | undefined = undefined; 
  let userPermissions: JiraPermissionsResponse | undefined = undefined;

  const cookieStore = await cookies();
  const authMethod = cookieStore.get('jira_auth_method')?.value;

  if (authMethod === 'api_token') {
    const email = cookieStore.get('jira_api_email')?.value;
    const apiToken = cookieStore.get('jira_api_token')?.value;
    selectedResourceUrl = cookieStore.get('jira_site_url')?.value;

    if (email && apiToken && selectedResourceUrl) {
      currentSource = 'live';
      console.log(`Jira API Token auth active. Email: ${email.substring(0,3)}..., Site URL: ${selectedResourceUrl}`);
    } else {
      apiErrorMessage = 'Jira API Token credentials or site URL not fully configured in cookies.';
      console.warn(apiErrorMessage);
      currentSource = 'mock'; // Fallback to mock if config is incomplete
    }
  } else {
    // TODO: Reinstate OAuth 2.0 logic here when reverting.
    // This includes fetching jira_access_token and then accessible-resources.
    apiErrorMessage = 'Jira not connected via API Token. OAuth 2.0 is temporarily disabled.';
    console.warn(apiErrorMessage);
    currentSource = 'mock'; // Fallback to mock if not API token mode
  }

  if (currentSource === 'mock' || !selectedResourceUrl) {
    return { 
      projects: mockProjects, 
      source: 'mock', 
      error: (apiErrorMessage || "Jira not configured for live data.") + " Displaying mock data.",
      // accessibleResources will be undefined here
      // userPermissions (declared at the top of the function) will be undefined here
    };
  }
  
  // userPermissions is already declared at the top of the function.
  // The following line is the redundant declaration and is removed.
  // let userPermissions: JiraPermissionsResponse | undefined = undefined; 
  try {
    const permissionsApiUrl = `${selectedResourceUrl}/rest/api/3/mypermissions?permissions=BROWSE_PROJECTS,ADMINISTER_PROJECTS`;
    console.log(`Fetching Jira user permissions from: ${permissionsApiUrl}`);
    
    const permissionsResponse = await fetchWithJiraAuth(permissionsApiUrl);
    console.log(`User Permissions API - Status: ${permissionsResponse.status}`);
    const permissionsResponseText = await permissionsResponse.text();

    if (!permissionsResponse.ok) {
      const permErrorMsg = `Failed to fetch Jira permissions. Status: ${permissionsResponse.status}. Details: ${permissionsResponseText}`;
      apiErrorMessage = apiErrorMessage ? `${apiErrorMessage}\n${permErrorMsg}` : permErrorMsg;
      console.error(permErrorMsg);
    } else {
      try {
        userPermissions = JSON.parse(permissionsResponseText);
        console.log('Jira User Permissions (parsed):', JSON.stringify(userPermissions, null, 2));
      } catch (parseError: any) {
        const parseErrorMsg = `Failed to parse user permissions JSON: ${parseError.message}. Raw response: ${permissionsResponseText}`;
        apiErrorMessage = apiErrorMessage ? `${apiErrorMessage}\n${parseErrorMsg}` : parseErrorMsg;
        console.error(parseErrorMsg);
      }
    }
  } catch (permError: any) {
    const permErrorMessage = `Network error fetching Jira permissions: ${permError.message}`;
    apiErrorMessage = apiErrorMessage ? `${apiErrorMessage}\n${permErrorMessage}` : permErrorMessage;
    console.error(permErrorMessage, permError);
  }

  try {
    const projectsApiUrl = `${selectedResourceUrl}/rest/api/3/project`;
    console.log(`Fetching Jira projects from: ${projectsApiUrl}`);
    
    const projectsApiResponse = await fetchWithJiraAuth(projectsApiUrl);
    console.log(`Projects API - Status: ${projectsApiResponse.status}`);
    const projectsResponseText = await projectsApiResponse.text();

    if (!projectsApiResponse.ok) {
      const detailedError = `API Error fetching projects from ${projectsApiUrl}. Status: ${projectsApiResponse.status}. Body: ${projectsResponseText}`;
      apiErrorMessage = apiErrorMessage ? `${apiErrorMessage}\n${detailedError}` : detailedError;
      console.error(detailedError);
      
      return {
        projects: mockProjects,
        source: 'mock',
        error: `Failed to fetch Jira projects. ${apiErrorMessage}`,
        permissions: userPermissions,
        accessibleResources,
        selectedResourceUrl
      };
    }

    let projectsData: JiraProject[] = [];
    try {
      projectsData = JSON.parse(projectsResponseText);
      console.log('Jira Projects Data (parsed):', JSON.stringify(projectsData.slice(0,2), null, 2), `(showing first 2 of ${projectsData.length})`);
    } catch (parseError: any) {
      const parseErrorMsg = `Failed to parse projects JSON: ${parseError.message}. Raw response: ${projectsResponseText}`;
      apiErrorMessage = apiErrorMessage ? `${apiErrorMessage}\n${parseErrorMsg}` : parseErrorMsg;
      console.error(parseErrorMsg);
      return { 
        projects: mockProjects,
        source: 'mock',
        error: `Failed to parse Jira projects response. ${apiErrorMessage}`,
        permissions: userPermissions,
        accessibleResources,
        selectedResourceUrl
      };
    }

    // Fetch analytics for each project in parallel
    console.log(`Fetching analytics for ${projectsData.length} projects...`);
    const analyticsPromises = projectsData.map(p => 
        getProjectAnalytics(p.key, selectedResourceUrl!) // selectedResourceUrl is guaranteed non-null here
    );
    const allAnalyticsData = await Promise.all(analyticsPromises);

    const projectsWithAnalytics = projectsData.map((project, index) => ({
        ...project,
        avatarUrls: project.avatarUrls && project.avatarUrls['48x48']
          ? project.avatarUrls
          : {'48x48': `https://placehold.co/48x48/E0E0E0/000000?text=${project.key?.substring(0,2).toUpperCase() || 'P'}`},
        analytics: allAnalyticsData[index], // Assign fetched analytics
    }));
    
    if (apiErrorMessage && currentSource === 'live') {
         console.warn(`Returning live data (with analytics) but encountered some issues during data fetching: ${apiErrorMessage}`);
         return {
             projects: projectsWithAnalytics,
             source: 'live', 
             error: `Partially fetched Jira data. Details: ${apiErrorMessage}`,
             permissions: userPermissions,
             accessibleResources,
             selectedResourceUrl
            };
    }
    console.log("--- getJiraProjectsAction completed successfully with live data (including analytics) ---");
    return { projects: projectsWithAnalytics, source: 'live', permissions: userPermissions, accessibleResources, selectedResourceUrl };

  } catch (error: any) {
    const errorMessage = `Unexpected error in getJiraProjectsAction (fetching projects): ${error.message}`;
    apiErrorMessage = apiErrorMessage ? `${apiErrorMessage}\n${errorMessage}` : errorMessage;
    console.error(errorMessage, error);
    return {
        projects: mockProjects,
        source: 'mock',
        error: apiErrorMessage || "An unexpected error occurred while fetching projects.",
        permissions: userPermissions,
        accessibleResources,
        selectedResourceUrl
    };
  }
}

// --- Interfaces for Project Detail Page ---
export interface JiraIssueStatus {
  name: string;
  statusCategory?: { key: string; name: string; };
}
export interface JiraIssueType {
  name: string;
  iconUrl?: string;
  subtask?: boolean;
}
export interface JiraUser {
  displayName: string;
  avatarUrls?: { '48x48'?: string; '24x24'?: string; };
  emailAddress?: string; // May not always be available depending on privacy settings
  accountId?: string;
}
export interface JiraPriority {
  name: string;
  iconUrl?: string;
}

// Simplified Jira Issue structure for the dashboard list
export interface JiraDashboardIssue {
  id: string;
  key: string;
  summary: string;
  status: JiraIssueStatus;
  issuetype: JiraIssueType;
  assignee?: JiraUser;
  priority?: JiraPriority;
  created: string;
  updated: string;
  description?: any; // Jira's ADF for description
}

// Extends JiraProject with more details typically found on a single project endpoint
export interface DetailedJiraProject extends JiraProject {
  description?: string;
  lead?: JiraUser;
  issueTypes?: JiraIssueType[];
  versions?: any[]; // Define further if versions are needed
  components?: any[]; // Define further if components are needed
}

export interface GetJiraProjectDetailsResponse {
  success: boolean;
  project?: DetailedJiraProject;
  issues?: JiraDashboardIssue[];
  error?: string;
  message?: string;
}

// Mock data for project details when Jira is not connected
const mockProjectDetails: Record<string, DetailedJiraProject> = {
  "PROJA": {
    id: "10001",
    key: "PROJA",
    name: "Project Alpha (Mock)",
    description: "This is a mock project for demonstration purposes. It simulates a software development project with various issue types and statuses.",
    projectTypeKey: "software",
    avatarUrls: {'48x48': 'https://placehold.co/48x48/64B5F6/FFFFFF?text=PA'},
    analytics: { totalIssues: 50, openIssues: 10, inProgressIssues: 5, doneIssues: 35},
    lead: { displayName: "John Doe", avatarUrls: { '48x48': 'https://placehold.co/48x48/E0E0E0/000000?text=JD' } }
  },
  "PROJB": {
    id: "10002",
    key: "PROJB",
    name: "Project Beta (Mock)",
    description: "A mock business project with various tasks and initiatives. Used for testing the dashboard functionality.",
    projectTypeKey: "business",
    avatarUrls: {'48x48': 'https://placehold.co/48x48/4DB6AC/FFFFFF?text=PB'},
    analytics: { totalIssues: 120, openIssues: 30, inProgressIssues: 20, doneIssues: 70},
    lead: { displayName: "Jane Smith", avatarUrls: { '48x48': 'https://placehold.co/48x48/E0E0E0/000000?text=JS' } }
  },
  "PROJC": {
    id: "10003",
    key: "PROJC",
    name: "Project Gamma (Mock)",
    description: "A mock service desk project for customer support and service management.",
    projectTypeKey: "service_desk",
    avatarUrls: {'48x48': 'https://placehold.co/48x48/FFB74D/FFFFFF?text=PC'},
    analytics: { totalIssues: 75, openIssues: 15, inProgressIssues: 10, doneIssues: 50},
    lead: { displayName: "Alex Johnson", avatarUrls: { '48x48': 'https://placehold.co/48x48/E0E0E0/000000?text=AJ' } }
  }
};

// Generate mock issues for a project
function generateMockIssues(projectKey: string, count: number = 20): JiraDashboardIssue[] {
  const statuses = [
    { name: "To Do", statusCategory: { key: "new", name: "To Do" } },
    { name: "In Progress", statusCategory: { key: "indeterminate", name: "In Progress" } },
    { name: "In Review", statusCategory: { key: "indeterminate", name: "In Progress" } },
    { name: "Done", statusCategory: { key: "done", name: "Done" } }
  ];
  
  const issueTypes = [
    { name: "Bug", iconUrl: "https://placehold.co/16x16/FF5252/FFFFFF?text=B", subtask: false },
    { name: "Task", iconUrl: "https://placehold.co/16x16/2196F3/FFFFFF?text=T", subtask: false },
    { name: "Story", iconUrl: "https://placehold.co/16x16/4CAF50/FFFFFF?text=S", subtask: false },
    { name: "Epic", iconUrl: "https://placehold.co/16x16/9C27B0/FFFFFF?text=E", subtask: false }
  ];
  
  const priorities = [
    { name: "Highest", iconUrl: "https://placehold.co/16x16/FF5252/FFFFFF?text=H" },
    { name: "High", iconUrl: "https://placehold.co/16x16/FF9800/FFFFFF?text=H" },
    { name: "Medium", iconUrl: "https://placehold.co/16x16/FFEB3B/FFFFFF?text=M" },
    { name: "Low", iconUrl: "https://placehold.co/16x16/8BC34A/FFFFFF?text=L" },
    { name: "Lowest", iconUrl: "https://placehold.co/16x16/2196F3/FFFFFF?text=L" }
  ];
  
  const assignees = [
    { displayName: "John Doe", avatarUrls: { '48x48': 'https://placehold.co/48x48/E0E0E0/000000?text=JD' } },
    { displayName: "Jane Smith", avatarUrls: { '48x48': 'https://placehold.co/48x48/E0E0E0/000000?text=JS' } },
    { displayName: "Alex Johnson", avatarUrls: { '48x48': 'https://placehold.co/48x48/E0E0E0/000000?text=AJ' } },
    { displayName: "Sarah Williams", avatarUrls: { '48x48': 'https://placehold.co/48x48/E0E0E0/000000?text=SW' } },
    undefined // Some issues will be unassigned (using undefined instead of null)
  ];
  
  const issues: JiraDashboardIssue[] = [];
  
  for (let i = 1; i <= count; i++) {
    const randomDate = (start: Date, end: Date) => {
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
    };
    
    const created = randomDate(new Date(2023, 0, 1), new Date(2023, 11, 31));
    const updated = randomDate(new Date(created), new Date());
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const issueType = issueTypes[Math.floor(Math.random() * issueTypes.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const assigneeIndex = Math.floor(Math.random() * assignees.length);
    const assignee = assignees[assigneeIndex];
    
    issues.push({
      id: `${projectKey}-${i}`,
      key: `${projectKey}-${i}`,
      summary: `Mock ${issueType.name}: ${["Implement", "Fix", "Update", "Review", "Test"][Math.floor(Math.random() * 5)]} ${["login page", "dashboard", "user profile", "settings", "navigation", "API integration", "database schema", "error handling"][Math.floor(Math.random() * 8)]}`,
      status,
      issuetype: issueType,
      assignee,
      priority,
      created,
      updated,
      description: "This is a mock issue description."
    });
  }
  
  return issues;
}

export async function getJiraProjectDetailsAction(projectIdOrKey: string): Promise<GetJiraProjectDetailsResponse> {
  console.log(`--- getJiraProjectDetailsAction for project: ${projectIdOrKey} ---`);
  const cookieStore = await cookies();
  const siteUrl = cookieStore.get('jira_site_url')?.value;
  const authMethod = cookieStore.get('jira_auth_method')?.value;

  // Check if we should use mock data
  if (authMethod !== 'api_token' || !siteUrl) {
    console.log("Jira not connected via API Token or site URL is missing for project details. Using mock data.");
    
    // Find the project key if an ID was provided
    let projectKey = projectIdOrKey;
    if (projectIdOrKey.match(/^\d+$/)) {
      // If projectIdOrKey is numeric (an ID), find the corresponding project key
      const projectEntry = Object.entries(mockProjectDetails).find(([_, project]) => project.id === projectIdOrKey);
      if (projectEntry) {
        projectKey = projectEntry[0];
      } else {
        // If no matching project found, default to PROJA
        projectKey = "PROJA";
      }
    }
    
    // Check if we have mock data for this project
    if (mockProjectDetails[projectKey]) {
      const mockProject = mockProjectDetails[projectKey];
      const mockIssues = generateMockIssues(projectKey);
      
      return {
        success: true,
        project: mockProject,
        issues: mockIssues,
        message: "Using mock data for project details and issues."
      };
    } else {
      // If no specific mock data for this project, return a generic error
      const errorMsg = `No mock data available for project ${projectIdOrKey}.`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  try {
    // 1. Fetch Project Details
    const projectDetailsUrl = `${siteUrl}/rest/api/3/project/${projectIdOrKey}`;
    console.log(`Fetching project details from: ${projectDetailsUrl}`);
    const projectResponse = await fetchWithJiraAuth(projectDetailsUrl);

    if (!projectResponse.ok) {
      const errorText = await projectResponse.text();
      const errorMsg = `Failed to fetch project details for ${projectIdOrKey}. Status: ${projectResponse.status}. Details: ${errorText}`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    const projectData: DetailedJiraProject = await projectResponse.json();
    console.log(`Successfully fetched details for project: ${projectData.name}`);

    // 2. Fetch Issues for the Project
    // Fetch key, summary, status, issuetype, assignee, priority, created, updated, description
    // Description can be large (ADF), consider if needed for list view or fetch on demand for issue detail
    const issueFields = "summary,status,issuetype,assignee,priority,created,updated,key,description";
    const jql = `project = "${projectIdOrKey}" ORDER BY updated DESC`;
    const issuesSearchUrl = `${siteUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${issueFields}&maxResults=50`; // Limiting to 50 for now
    
    console.log(`Fetching issues for project ${projectIdOrKey} from: ${issuesSearchUrl}`);
    const issuesResponse = await fetchWithJiraAuth(issuesSearchUrl);

    if (!issuesResponse.ok) {
      const errorText = await issuesResponse.text();
      const errorMsg = `Failed to fetch issues for project ${projectIdOrKey}. Status: ${issuesResponse.status}. Details: ${errorText}`;
      console.error(errorMsg);
      // Return project details even if issues fail, but include error
      return { success: true, project: projectData, error: errorMsg, message: "Successfully fetched project details, but failed to fetch issues." };
    }
    const issuesResult = await issuesResponse.json();
    const issuesRaw = issuesResult.issues || [];
    console.log(`Successfully fetched ${issuesRaw.length} issues for project ${projectIdOrKey}.`);

    // Map raw issues to our JiraDashboardIssue structure
    const issues: JiraDashboardIssue[] = issuesRaw.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status, // Assuming full status object is fine
      issuetype: issue.fields.issuetype,
      assignee: issue.fields.assignee,
      priority: issue.fields.priority,
      created: issue.fields.created,
      updated: issue.fields.updated,
      description: issue.fields.description, // Keep ADF for now
    }));

    return {
      success: true,
      project: projectData,
      issues: issues,
      message: `Successfully fetched details and ${issues.length} issues for project ${projectData.name}.`
    };

  } catch (error: any) {
    const errorMsg = `Unexpected error fetching project details for ${projectIdOrKey}: ${error.message}`;
    console.error(errorMsg, error);
    return { success: false, error: errorMsg };
  }
}
