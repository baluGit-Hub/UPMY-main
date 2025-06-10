"use client";

import { useState, useRef, useEffect } from "react";
import PageHeader from "@/components/page-header";
import { notFound } from "next/navigation";
import { getJiraProjectDetailsAction, type DetailedJiraProject, type JiraDashboardIssue } from "@/app/project-overview/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import chart components
import IssuesByStatusPieChart from "@/components/charts/IssuesByStatusPieChart";
import IssuesByTypeBarChart from "@/components/charts/IssuesByTypeBarChart";
import IssuesByAssigneeChart from "@/components/charts/IssuesByAssigneeChart";
import IssuesByTimelineChart from "@/components/charts/IssuesByTimelineChart";
import BurndownChart from "@/components/charts/BurndownChart";
import ChartFilters, { FilterOptions } from "@/components/charts/ChartFilters";
import ChartDrilldown from "@/components/charts/ChartDrilldown";

// Import utilities
import { 
  filterIssues, 
  processIssuesByStatus, 
  processIssuesByType, 
  processIssuesByAssignee,
  processIssuesForTimeline,
  processIssuesForBurndown,
  getAvailableFilterOptions,
  getIssuesByStatus,
  getIssuesByType,
  getIssuesByAssignee
} from "@/lib/chart-data-utils";
import { 
  exportChartAsImage, 
  exportChartAsPDF, 
  exportIssuesAsCSV, 
  printElement 
} from "@/lib/chart-export";

interface ProjectDetailPageProps {
  params: {
    projectId: string;
  };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId: projectIdOrKey } = params;
  const [project, setProject] = useState<DetailedJiraProject | null>(null);
  const [issues, setIssues] = useState<JiraDashboardIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [filteredIssues, setFilteredIssues] = useState<JiraDashboardIssue[]>([]);
  const [drilldownOpen, setDrilldownOpen] = useState<boolean>(false);
  const [drilldownTitle, setDrilldownTitle] = useState<string>("");
  const [drilldownIssues, setDrilldownIssues] = useState<JiraDashboardIssue[]>([]);
  
  // Refs for chart containers (used for export)
  const statusChartRef = useRef<HTMLDivElement>(null);
  const typeChartRef = useRef<HTMLDivElement>(null);
  const assigneeChartRef = useRef<HTMLDivElement>(null);
  const timelineChartRef = useRef<HTMLDivElement>(null);
  const burndownChartRef = useRef<HTMLDivElement>(null);
  
  // Fetch project data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getJiraProjectDetailsAction(projectIdOrKey);
        
        if (response.success && response.project) {
          setProject(response.project);
          setIssues(response.issues || []);
          setFilteredIssues(response.issues || []);
          setMessage(response.message || null);
          setError(response.error || null);
        } else {
          setError(response.error || "Failed to load project details");
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [projectIdOrKey]);

  // Handle filter changes
  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    const filtered = filterIssues(issues, newFilters);
    setFilteredIssues(filtered);
  };
  
  // Handle drill-down
  const handleStatusClick = (statusName: string) => {
    const statusIssues = getIssuesByStatus(filteredIssues, statusName);
    setDrilldownTitle(`Issues with Status: ${statusName}`);
    setDrilldownIssues(statusIssues);
    setDrilldownOpen(true);
  };
  
  const handleTypeClick = (typeName: string) => {
    const typeIssues = getIssuesByType(filteredIssues, typeName);
    setDrilldownTitle(`Issues of Type: ${typeName}`);
    setDrilldownIssues(typeIssues);
    setDrilldownOpen(true);
  };
  
  const handleAssigneeClick = (assigneeName: string) => {
    const assigneeIssues = getIssuesByAssignee(filteredIssues, assigneeName);
    setDrilldownTitle(`Issues Assigned to: ${assigneeName}`);
    setDrilldownIssues(assigneeIssues);
    setDrilldownOpen(true);
  };
  
  // Export functions
  const handleExportChart = (chartRef: React.RefObject<HTMLDivElement>, fileName: string) => {
    if (chartRef.current && chartRef.current.id) {
      exportChartAsImage(chartRef.current.id, fileName);
    }
  };
  
  const handleExportPDF = (chartRef: React.RefObject<HTMLDivElement>, fileName: string, title: string) => {
    if (chartRef.current && chartRef.current.id) {
      exportChartAsPDF(chartRef.current.id, fileName, title);
    }
  };
  
  const handleExportCSV = () => {
    exportIssuesAsCSV(filteredIssues, `${project?.key || 'project'}-issues`);
  };
  
  const handlePrintChart = (chartRef: React.RefObject<HTMLDivElement>, title: string) => {
    if (chartRef.current && chartRef.current.id) {
      printElement(chartRef.current.id, title);
    }
  };
  
  // If loading or error, show appropriate message
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={`Loading Project ${projectIdOrKey}`} description="Fetching project details..." />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (error && !project) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={`Error for Project ${projectIdOrKey}`} description="Failed to load project details." />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!project) {
    notFound();
    return null;
  }
  
  // Generate chart data
  const statusChartData = processIssuesByStatus(filteredIssues);
  const typeChartData = processIssuesByType(filteredIssues);
  const assigneeChartData = processIssuesByAssignee(filteredIssues);
  const timelineChartData = processIssuesForTimeline(filteredIssues);
  const burndownData = processIssuesForBurndown(filteredIssues);
  const availableFilters = getAvailableFilterOptions(issues);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={project.name || `Project ${projectIdOrKey}`}
        description={project.description || `Detailed view of project ${project.key || projectIdOrKey}.`}
      />

      {message && !error && (
        <Alert variant="default" className="bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Status</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Issue Fetching Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Column 1: Project Info & Key Stats */}
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Key: {project.key} (ID: {project.id})</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Type: {project.projectTypeKey || 'N/A'}
            </p>
            {project.lead && <p className="text-sm text-muted-foreground">Lead: {project.lead.displayName}</p>}
            {project.description && <p className="mt-2 text-sm">{project.description}</p>}
            <h3 className="font-semibold mt-4 mb-2 text-md">Quick Stats</h3>
            {project.analytics ? (
              <ul className="list-disc list-inside text-sm">
                <li>Total Issues: {project.analytics.totalIssues}</li>
                <li>Open Issues: {project.analytics.openIssues}</li>
                <li>In Progress: {project.analytics.inProgressIssues}</li>
                <li>Done: {project.analytics.doneIssues}</li>
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Overall project analytics not available.</p>
            )}
            
            <div className="mt-6">
              <h3 className="font-semibold mb-2 text-md">Export Options</h3>
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportCSV}
                  className="justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export All Issues as CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.print()}
                  className="justify-start"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 2 & 3: Charts Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Dashboard Filters</CardTitle>
              <CardDescription>Filter the charts below by various criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartFilters 
                availableFilters={availableFilters}
                onFilterChange={handleFilterChange}
              />
              <div className="text-xs text-muted-foreground mt-2">
                Showing {filteredIssues.length} of {issues.length} issues
              </div>
            </CardContent>
          </Card>
          
          {/* Charts Tabs */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Project Analytics</CardTitle>
              <CardDescription>Interactive charts showing project metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="distribution">
                <TabsList className="mb-4">
                  <TabsTrigger value="distribution">Distribution</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="burndown">Burndown</TabsTrigger>
                </TabsList>
                
                {/* Distribution Charts */}
                <TabsContent value="distribution" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status Distribution Chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-base">Status Distribution</CardTitle>
                            <CardDescription>Issues by current status</CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleExportChart(statusChartRef, `${project.key}-status-chart`)}
                              title="Export as Image"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handlePrintChart(statusChartRef, "Status Distribution")}
                              title="Print Chart"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div id="status-chart" ref={statusChartRef}>
                          <IssuesByStatusPieChart 
                            data={statusChartData} 
                            onSliceClick={handleStatusClick}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Issue Type Chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-base">Issue Types</CardTitle>
                            <CardDescription>Distribution by issue type</CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleExportChart(typeChartRef, `${project.key}-type-chart`)}
                              title="Export as Image"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handlePrintChart(typeChartRef, "Issue Types")}
                              title="Print Chart"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div id="type-chart" ref={typeChartRef}>
                          <IssuesByTypeBarChart 
                            data={typeChartData} 
                            onBarClick={handleTypeClick}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assignee Chart */}
                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-base">Assignee Workload</CardTitle>
                            <CardDescription>Issues assigned per team member</CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleExportChart(assigneeChartRef, `${project.key}-assignee-chart`)}
                              title="Export as Image"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handlePrintChart(assigneeChartRef, "Assignee Workload")}
                              title="Print Chart"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div id="assignee-chart" ref={assigneeChartRef}>
                          <IssuesByAssigneeChart 
                            data={assigneeChartData} 
                            onBarClick={handleAssigneeClick}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                {/* Timeline Chart */}
                <TabsContent value="timeline">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-base">Issues Timeline</CardTitle>
                          <CardDescription>Created vs. Resolved issues over time</CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleExportChart(timelineChartRef, `${project.key}-timeline-chart`)}
                            title="Export as Image"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handlePrintChart(timelineChartRef, "Issues Timeline")}
                            title="Print Chart"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div id="timeline-chart" ref={timelineChartRef}>
                        <IssuesByTimelineChart data={timelineChartData} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Burndown Chart */}
                <TabsContent value="burndown">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-base">Sprint Burndown</CardTitle>
                          <CardDescription>Remaining work over time</CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleExportChart(burndownChartRef, `${project.key}-burndown-chart`)}
                            title="Export as Image"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handlePrintChart(burndownChartRef, "Sprint Burndown")}
                            title="Print Chart"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div id="burndown-chart" ref={burndownChartRef}>
                        <BurndownChart 
                          data={burndownData.data} 
                          startDate={burndownData.startDate}
                          endDate={burndownData.endDate}
                          totalScope={burndownData.totalScope}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Drilldown Modal */}
      <ChartDrilldown
        isOpen={drilldownOpen}
        onClose={() => setDrilldownOpen(false)}
        title={drilldownTitle}
        issues={drilldownIssues}
        onExport={() => exportIssuesAsCSV(drilldownIssues, `${project.key}-${drilldownTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`)}
        onPrint={() => {
          const element = document.getElementById('drilldown-content');
          if (element) {
            printElement('drilldown-content', drilldownTitle);
          }
        }}
      />
    </div>
  );
}
