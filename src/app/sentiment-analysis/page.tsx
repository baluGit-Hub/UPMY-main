
import PageHeader from "@/components/page-header";
import SentimentForm from "@/components/sentiment/sentiment-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function SentimentAnalysisPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sentiment Analysis"
        description="Analyze sentiment in project comments and descriptions to identify potential roadblocks."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SentimentForm />
        </div>
        <div className="lg:col-span-1">
           <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>How it Works</CardTitle>
            </CardHeader>
            <CardContent>
                <Image 
                    src="https://placehold.co/600x400/F0F4F7/64B5F6?text=AI+Sentiment+Analysis" 
                    alt="AI Sentiment Analysis Visual" 
                    width={600} 
                    height={400} 
                    className="rounded-lg mb-4"
                    data-ai-hint="artificial intelligence data"
                    dangerouslyAllowSVG // Correct prop for next/image for external SVGs
                />
                <p className="text-sm text-muted-foreground">
                    Our AI-powered sentiment analysis tool processes the text from your project tickets (comments, descriptions)
                    to determine the underlying emotion. It identifies whether the sentiment is positive, negative, or neutral,
                    provides a confidence score, and explains its reasoning.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                    This helps you proactively identify potential issues, gauge team morale, and understand customer feedback more effectively.
                </p>
            </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
