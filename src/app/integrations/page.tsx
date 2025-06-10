
"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { JiraIcon, TrelloIcon } from "@/components/icons";
import { Link as LinkIcon, Settings, Loader2, LogOut } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { 
  connectIntegrationAction, 
  disconnectIntegrationAction, 
  type IntegrationActionResponse 
} from "./actions";
import { JiraApiTokenForm } from "@/components/integrations/JiraApiTokenForm"; // Import the new form

interface Integration {
  name: string;
  description: string;
  icon: JSX.Element;
  connected: boolean;
  category: string;
}

const initialIntegrationsData: Integration[] = [
  {
    name: "Jira",
    description: "Connect your Jira instance to sync project tasks, sprints, and issues.",
    icon: <JiraIcon className="h-10 w-10 text-blue-600" />,
    connected: false, 
    category: "Project Management"
  },
  {
    name: "Trello",
    description: "Link your Trello boards to track progress and visualize workflows.",
    icon: <TrelloIcon className="h-10 w-10 text-sky-600" />,
    connected: false,
    category: "Task Management"
  },
  {
    name: "GitHub",
    description: "Integrate with GitHub to link commits, pull requests, and issues to tasks.",
    icon: <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-10 w-10"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>,
    connected: false,
    category: "Version Control"
  },
   {
    name: "Slack",
    description: "Receive notifications and updates directly in your Slack channels.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-purple-600"><path d="M2.3 16.8a2.4 2.4 0 0 1 0-3.3l7.4-7.4a2.4 2.4 0 0 1 3.3 0l7.4 7.4a2.4 2.4 0 0 1 0 3.3l-7.4 7.4a2.4 2.4 0 0 1-3.3 0Z"></path><path d="M7.2 12.5a2.4 2.4 0 0 1 0-3.3L12.5 4"></path><path d="m16.8 11.5-5.3 5.3a2.4 2.4 0 0 1-3.3 0"></path><path d="M11.5 7.2a2.4 2.4 0 0 1 3.3 0L20 12.5"></path><path d="m12.5 16.8 5.3-5.3a2.4 2.4 0 0 1 0 3.3Z"></path></svg>,
    connected: false,
    category: "Communication"
  },
];

interface IntegrationLoadingState {
  [key: string]: boolean;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrationsData);
  const [loadingStates, setLoadingStates] = useState<IntegrationLoadingState>({});
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Helper to read cookies on the client-side
    const getCookie = (name: string): string | null => {
      if (typeof document === 'undefined') return null; // Guard for SSR if ever run there
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

    // Check for Jira API token connection status
    const jiraAuthMethod = getCookie('jira_auth_method');
    const jiraApiEmail = getCookie('jira_api_email'); // Check if email is set as a proxy for connection

    if (jiraAuthMethod === 'api_token' && jiraApiEmail) {
      setIntegrations(prev => prev.map(int =>
        int.name === "Jira" ? { ...int, connected: true } : int
      ));
    } else {
      // If not API token, check for old OAuth params (though OAuth is disabled for Jira)
      // This part handles potential lingering OAuth error messages if user tried old flow
      const jiraErrorParam = searchParams.get('jira_error');
      if (jiraErrorParam) {
        toast({
          title: "Jira Connection Error",
          description: `OAuth flow failed: ${jiraErrorParam}. Please use API Token method.`,
          variant: "destructive",
        });
         // Clean up OAuth error params from URL
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('jira_error');
        currentUrl.searchParams.delete('jira_connected'); // also clean this if present
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
      }
       // Ensure Jira is marked as disconnected if no valid API token cookies
       setIntegrations(prev => prev.map(int =>
        int.name === "Jira" && !(jiraAuthMethod === 'api_token' && jiraApiEmail) 
        ? { ...int, connected: false } 
        : int
      ));
    }
  }, [searchParams, toast, router]);

  const handleJiraApiTokenConnectSuccess = () => {
    setIntegrations(prev => prev.map(int =>
      int.name === "Jira" ? { ...int, connected: true } : int
    ));
    // Toast is handled by the form component, but could add another one here if needed
  };

  const handleServerActionResponse = (response: IntegrationActionResponse, integrationName: string, intendedConnectionStatus: boolean) => {
    // For Jira, the OAuth redirectUrl path is now disabled in connectIntegrationAction.
    // If it were ever re-enabled and hit, this would handle it.
    if (response.redirectUrl && integrationName === "Jira") {
       console.warn("Jira OAuth redirect attempted, but API token method is primary.");
       // window.location.href = response.redirectUrl; // Temporarily disabled
       toast({
          title: `Error with ${integrationName}`,
          description: "OAuth flow for Jira is temporarily disabled. Please use API Token form.",
          variant: "destructive",
        });
       setLoadingStates(prev => ({ ...prev, [integrationName]: false }));
       return; 
    }

    if (response.success) {
      setIntegrations(prev => prev.map(int =>
        int.name === integrationName ? { ...int, connected: intendedConnectionStatus } : int
      ));
      toast({
        title: response.message,
        description: `${integrationName} status updated.`,
      });
    } else {
      toast({
        title: `Error with ${integrationName}`,
        description: response.error || response.message || "An unknown error occurred.",
        variant: "destructive",
      });
    }
    setLoadingStates(prev => ({ ...prev, [integrationName]: false }));
  };

  const handleConnect = (integrationName: string) => {
    setLoadingStates(prev => ({ ...prev, [integrationName]: true }));
    const formData = new FormData();
    formData.append("integrationName", integrationName);

    startTransition(async () => {
      const response = await connectIntegrationAction(formData);
      handleServerActionResponse(response, integrationName, response.success && !response.redirectUrl);
    });
  };

  const handleDisconnect = (integrationName: string) => {
    setLoadingStates(prev => ({ ...prev, [integrationName]: true }));
    const formData = new FormData();
    formData.append("integrationName", integrationName);

    startTransition(async () => {
      const response = await disconnectIntegrationAction(formData);
      handleServerActionResponse(response, integrationName, !response.success);
    });
  };

  const handleSettings = (integrationName: string) => {
    toast({
      title: `Settings for ${integrationName}`,
      description: `Configure your ${integrationName} integration settings here. (Not implemented)`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tool Integrations"
        description="Connect your favorite project management and development tools to Project Insights."
      />

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Connect Your Tools</CardTitle>
          <CardDescription>
            Streamline your workflow by integrating the tools your team already uses.
            Gain deeper insights by combining data from multiple sources.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="relative aspect-[16/7] w-full overflow-hidden rounded-lg mb-8">
            <Image 
              src="https://placehold.co/1200x525/F0F4F7/4DB6AC?text=Connect+Your+Workflow" 
              alt="Tool Integration Banner" 
              fill 
              style={{objectFit: "cover"}} 
              data-ai-hint="workflow tools connection" 
              // dangerouslyAllowSVG prop removed as it's not a valid prop for next/image.
              // SVG handling from remote domains needs configuration in next.config.js.
            />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <Card key={integration.name} className="flex flex-col shadow-md hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  {integration.icon}
                  <div className="flex-1">
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">{integration.category}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                </CardContent>
                <CardFooter>
                  {loadingStates[integration.name] || (isPending && loadingStates[integration.name] !== false) ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </Button>
                  ) : integration.connected ? (
                    <div className="flex w-full items-center justify-between gap-2">
                       <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDisconnect(integration.name)}
                        disabled={loadingStates[integration.name] || isPending}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                       <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => handleSettings(integration.name)}
                        disabled={loadingStates[integration.name] || isPending}
                      >
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Settings for {integration.name}</span>
                      </Button>
                    </div>
                  ) : (
                    // Removed extra curly braces around this conditional rendering block
                    integration.name === "Jira" ? (
                      <JiraApiTokenForm onSuccess={handleJiraApiTokenConnectSuccess} />
                    ) : (
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => handleConnect(integration.name)}
                        disabled={loadingStates[integration.name] || isPending}
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Connect
                      </Button>
                    )
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
