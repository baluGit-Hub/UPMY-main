
"use client";

import { useEffect, useState, useTransition } from "react";
import PageHeader from "@/components/page-header";
import { getJiraProjectsAction, type JiraProject, type GetProjectsResponse } from "./actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, PieChart, ListChecks, Loader2, ExternalLink, AlertTriangle, Info, CheckCircle } from "lucide-react";
import Image from "next/image"; 
import Link from "next/link"; // Import Link
import { useToast } from "@/hooks/use-toast";

export default function ProjectOverviewPage() {
  const [projectData, setProjectData] = useState<GetProjectsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    startTransition(async () => {
      setIsLoading(true);
      const response = await getJiraProjectsAction();
      setProjectData(response);
      setIsLoading(false);
      if (response.error && response.source !== 'hardcoded_token') { // Don't show error toast if hardcoded token fails, as it's expected to be user-managed
        toast({
          variant: "destructive",
          title: "Error Fetching Projects",
          description: response.error,
        });
      } else if (response.source === 'live') {
         toast({
          title: "Projects Loaded",
          description: "Successfully fetched projects from Jira.",
          variant: "default"
        });
      } else if (response.source === 'hardcoded_token') {
        if (response.error) {
            toast({
              variant: "destructive",
              title: "Hardcoded Token Error",
              description: `Failed to fetch projects with hardcoded token: ${response.error}`,
            });
        } else {
            toast({
              variant: "default", // Changed "warning" to "default"
              title: "Warning: Using Hardcoded Token", // Title updated to reflect warning
              description: "Displaying Jira projects using a temporary hardcoded token. THIS IS FOR TESTING ONLY.",
            });
        }
      } else if (response.source === 'mock') {
        toast({
          variant: "default", // Changed from destructive if only mock data is shown without explicit error
          title: "Displaying Mock Data",
          description: response.error || "Could not fetch live Jira projects. Showing sample data.",
        });
      }
    });
  }, [toast]);

  const getProjectIcon = (projectTypeKey?: string) => {
    switch (projectTypeKey) {
      case "software":
        return <Terminal className="h-5 w-5 text-primary" />;
      case "service_desk":
        return <ListChecks className="h-5 w-5 text-destructive" />;
      case "business":
        return <PieChart className="h-5 w-5 text-accent" />;
      default:
        return <Terminal className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Project Overview"
        description="View and analyze your projects from connected platforms."
      />

      {isLoading || isPending ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading projects...</p>
        </div>
      ) : !projectData || projectData.projects.length === 0 ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>No Projects Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {projectData?.error ? projectData.error : "Could not find any projects. Ensure Jira is connected and you have access to projects, or check hardcoded token if active."}
            </p>
             {projectData?.source === 'mock' && !projectData.error && (
                <p className="text-sm text-muted-foreground mt-2">Currently displaying sample mock data as live data could not be fetched.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {projectData.source === 'hardcoded_token' && (
             <Alert variant="warning" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Using Hardcoded Token</AlertTitle>
              <AlertDescription>
                Displaying live Jira projects using a temporary hardcoded token. This is for testing only and is insecure. Remember to remove it.
                {projectData.error && <span className="block mt-1 text-destructive">{`Error with token: ${projectData.error}`}</span>}
              </AlertDescription>
            </Alert>
          )}
          {projectData.source === 'mock' && projectData.error && (
             <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Displaying Mock Data Due to Error</AlertTitle>
              <AlertDescription>
                {projectData.error}
              </AlertDescription>
            </Alert>
          )}
           {projectData.source === 'live' && (
             <Alert variant="default" className="mb-4 bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700">
              <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-300">Live Data</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">
                Successfully displaying live project data from Jira.
              </AlertDescription>
            </Alert>
          )}
          {projectData.source === 'mock' && !projectData.error && (
             <Alert variant="default" className="mb-4 bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700">
              <Info className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-300">Displaying Mock Data</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                No Jira connection found or error fetching live data. Showing sample data.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projectData.projects.map((project) => (
              <Card key={project.id} className="flex flex-col shadow-md hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {project.avatarUrls && project.avatarUrls['48x48'] ? (
                      <Image
                        src={project.avatarUrls['48x48']}
                        alt={`${project.name} avatar`}
                        width={48}
                        height={48}
                        className="rounded-md border"
                        data-ai-hint="logo company"
                        unoptimized={
                          project.avatarUrls['48x48'].includes('placehold.co') ||
                          project.avatarUrls['48x48'].includes('atlassian.net')
                        } 
                        // dangerouslyAllowSVG prop removed as it's not a valid prop for next/image.
                        // SVG handling from remote domains needs configuration in next.config.js.
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-secondary">
                        {getProjectIcon(project.projectTypeKey)}
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="text-xs">
                        ID: {project.id} - Key: {project.key?.toUpperCase()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Project Type: <span className="font-medium text-foreground">{project.projectTypeKey || 'N/A'}</span>
                  </p>
                  {project.analytics && (
                    <div className="space-y-1 text-sm">
                        <p>Total Issues: <span className="font-semibold text-primary">{project.analytics.totalIssues}</span></p>
                        <p>Open: <span className="font-semibold text-red-600">{project.analytics.openIssues}</span></p>
                        <p>In Progress: <span className="font-semibold text-yellow-600">{project.analytics.inProgressIssues}</span></p>
                        <p>Done: <span className="font-semibold text-green-600">{project.analytics.doneIssues}</span></p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Link href={`/project/${project.key}`} passHref className="w-full">
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
