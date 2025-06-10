
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Filter } from "lucide-react";
import { VelocityChart } from "@/components/velocity/velocity-chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";

export default function VelocityPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Velocity Tracking"
        description="Monitor your team's sprint velocity and historical performance."
        actions={
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Sprint Velocity History</CardTitle>
              <CardDescription>Committed vs. Completed story points over sprints.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <Select defaultValue="project-a">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project-a">Project Alpha</SelectItem>
                  <SelectItem value="project-b">Project Beta</SelectItem>
                  <SelectItem value="project-c">Project Gamma</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="last-6-months">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-3-months">Last 3 Sprints</SelectItem>
                  <SelectItem value="last-6-months">Last 6 Sprints</SelectItem>
                  <SelectItem value="last-12-months">Last 12 Sprints</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pl-2">
          <VelocityChart />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Average Velocity</CardTitle>
            <CardDescription>Calculated over the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">38 pts</p>
            <p className="text-sm text-muted-foreground">Slight increase from previous average of 35 pts.</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardDescription>Percentage of committed work completed.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-accent">92%</p>
            <p className="text-sm text-muted-foreground">Consistent performance over last 3 sprints.</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Team Performance Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
            <Image 
              src="https://placehold.co/800x450/F0F4F7/4DB6AC?text=Team+Performance" 
              alt="Team Performance" 
              fill 
              style={{objectFit: "cover"}} 
              data-ai-hint="team working charts"
              dangerouslyAllowSVG // Correct prop for next/image for external SVGs
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
