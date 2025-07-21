import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlaskConical, BarChart3, Calculator, Zap, Shield, TrendingUp } from 'lucide-react';

export function About() {
  const features = [
    {
      icon: FlaskConical,
      title: 'Test Planning',
      description: 'Plan A/B tests with hypothesis definition, sample size calculation, and duration estimation.'
    },
    {
      icon: BarChart3,
      title: 'Data Upload',
      description: 'Upload CSV datasets with drag-and-drop interface and automatic column mapping detection.'
    },
    {
      icon: Calculator,
      title: 'Statistical Analysis',
      description: 'Perform two-proportion z-tests with confidence intervals, p-values, and significance testing.'
    },
    {
      icon: TrendingUp,
      title: 'Results Visualization',
      description: 'Interactive charts and detailed performance breakdowns with export capabilities.'
    },
    {
      icon: Zap,
      title: 'Real-time Calculations',
      description: 'Instant sample size and duration calculations as you adjust test parameters.'
    },
    {
      icon: Shield,
      title: 'Local Storage',
      description: 'All data is stored locally in your browser for privacy and security.'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">About A/B Test Tool</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          A comprehensive statistical analysis platform for designing, managing, and analyzing A/B tests 
          with professional-grade statistical methods and intuitive visualizations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FlaskConical className="mr-2 h-6 w-6 text-primary" />
              What is A/B Testing?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              A/B testing (also known as split testing) is a method of comparing two versions of a webpage, 
              email, or other marketing asset to determine which one performs better. By randomly showing 
              different variants to different users and measuring their behavior, you can make data-driven 
              decisions about what changes actually improve your key metrics.
            </p>
            <p>
              This tool provides the statistical framework to properly design, execute, and analyze A/B tests 
              with confidence intervals, significance testing, and sample size calculations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistical Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold">Two-Proportion Z-Test</h4>
              <p className="text-sm text-muted-foreground">
                Compare conversion rates between control and variant groups
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Sample Size Calculation</h4>
              <p className="text-sm text-muted-foreground">
                Determine required sample size for desired power and significance level
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Confidence Intervals</h4>
              <p className="text-sm text-muted-foreground">
                95% confidence intervals for accurate effect size estimation
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold">CSV Format</h4>
              <p className="text-sm text-muted-foreground">
                Upload data in standard CSV format (max 5MB)
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Required Columns</h4>
              <p className="text-sm text-muted-foreground">
                Variant identifier and conversion indicator columns
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Optional Columns</h4>
              <p className="text-sm text-muted-foreground">
                Customer ID, timestamp, and additional metrics
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 text-center">Key Features</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                1
              </div>
              <h4 className="font-semibold mb-1">Plan Test</h4>
              <p className="text-sm text-muted-foreground">Define hypotheses and expected conversion rates</p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                2
              </div>
              <h4 className="font-semibold mb-1">Upload Data</h4>
              <p className="text-sm text-muted-foreground">Import your A/B test results via CSV</p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                3
              </div>
              <h4 className="font-semibold mb-1">Configure</h4>
              <p className="text-sm text-muted-foreground">Map columns and set analysis parameters</p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                4
              </div>
              <h4 className="font-semibold mb-1">Analyze</h4>
              <p className="text-sm text-muted-foreground">View results and statistical significance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample Data Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm overflow-x-auto">
{`S.No,Customer Name,Customer ID,Variant Type,Opened Email,Clicked Link,Converted,Date
1,Frank Williams,C0001,Control,Yes,No,No,27-05-2025
2,Helen Williams,C0002,Test,Yes,No,No,07-07-2025
3,Helen Wilson,C0003,Control,Yes,No,No,27-06-2025
4,Helen Smith,C0004,Control,Yes,Yes,Yes,11-05-2025`}
            </pre>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Your CSV should include variant identifiers (Control/Test) and conversion indicators (Yes/No or 1/0).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}