import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TestStorage } from '@/lib/storage';
import { ABTest } from '@/types';
import { TestPlanning } from './TestPlanning';
import { DataUpload } from './DataUpload';
import { TestResults } from './TestResults';
import { Calendar, Upload, Settings, BarChart3, Play } from 'lucide-react';
import { format } from 'date-fns';

export function TestDetail() {
  const { testId } = useParams();
  const [test, setTest] = useState<ABTest | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (testId) {
      const testData = TestStorage.getTest(testId);
      setTest(testData);
    }
  }, [testId]);

  if (!testId) {
    return <Navigate to="/" replace />;
  }

  if (!test) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Test not found</h2>
        <p className="text-muted-foreground mb-4">The test you're looking for doesn't exist.</p>
        <Button asChild>
          <Link to="/">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'running': return 'warning';
      case 'completed': return 'success';
      default: return 'secondary';
    }
  };

  const getNextStep = () => {
    if (!test.data) return { tab: 'upload', label: 'Upload Data' };
    if (test.status === 'draft' || test.status === 'running') return { tab: 'results', label: 'View Results' };
    return null;
  };

  const nextStep = getNextStep();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{test.name}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant={getStatusColor(test.status) as any}>
              {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
            </Badge>
            <span className="text-muted-foreground flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              Created: {format(new Date(test.createdDate), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
        {nextStep && (
          <Button onClick={() => setActiveTab(nextStep.tab)}>
            <Play className="mr-2 h-4 w-4" />
            {nextStep.label}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="upload">Data Upload</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Test Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">Hypotheses</h4>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">H0:</span>
                      <p className="text-sm">{test.hypothesis.h0 || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">H1:</span>
                      <p className="text-sm">{test.hypothesis.h1 || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold">Expected Performance</h4>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Control Rate:</span>
                      <p className="font-medium">{(test.expectedConversionRates.control * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Variant Rate:</span>
                      <p className="font-medium">{(test.expectedConversionRates.mode * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sample Size:</span>
                    <p className="font-medium">{test.sampleSize.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium">{test.estimatedDuration} days</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Traffic/Day:</span>
                    <p className="font-medium">{test.trafficPerDay.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tail Type:</span>
                    <p className="font-medium">{test.tailType}</p>
                  </div>
                </div>
                
                {test.data && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Data Status</h4>
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-success" />
                      <span className="text-sm">Data uploaded: {test.data.fileName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {test.data.rows.length.toLocaleString()} rows, {test.data.columns.length} columns
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {test.results && (
            <Card>
              <CardHeader>
                <CardTitle>Results Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Winner</p>
                    <p className="text-2xl font-bold text-primary">{test.results.summary.winningMode}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Uplift</p>
                    <p className="text-2xl font-bold text-accent">{test.results.uplift.relative.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Significance</p>
                    <p className={`text-2xl font-bold ${test.results.summary.isStatisticallySignificant ? 'text-success' : 'text-destructive'}`}>
                      {test.results.summary.isStatisticallySignificant ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button onClick={() => setActiveTab('planning')}>
              <Settings className="mr-2 h-4 w-4" />
              Edit Configuration
            </Button>
            {!test.data && (
              <Button variant="outline" onClick={() => setActiveTab('upload')}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Data
              </Button>
            )}
            {test.data && (
              <Button variant="outline" onClick={() => setActiveTab('results')}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Results
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="planning">
          <TestPlanning testId={testId} />
        </TabsContent>

        <TabsContent value="upload">
          <DataUpload testId={testId} />
        </TabsContent>

        <TabsContent value="results">
          <TestResults />
        </TabsContent>
      </Tabs>
    </div>
  );
}