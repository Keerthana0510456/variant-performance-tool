import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TestStorage } from '@/lib/storage';
import { analyzeTestData } from '@/lib/statistics';
import { analyzeData, convertABTestDataToAnalyzerFormat, StatisticalResult } from '@/lib/dynamicStatisticalAnalyzer';
import { ABTest } from '@/types';
import { TrendingUp, Download, Share, Award, BarChart3, CheckCircle, XCircle, HelpCircle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function TestResults() {
  const { testId } = useParams();
  const { toast } = useToast();
  const [test, setTest] = useState<ABTest | null>(null);
  const [results, setResults] = useState<any>(null);
  const [dynamicAnalysis, setDynamicAnalysis] = useState<StatisticalResult | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dynamic statistical parameters
  const [statisticalParams, setStatisticalParams] = useState({
    significanceLevel: 0.05,
    power: 0.8,
    confidenceLevel: 0.95
  });

  useEffect(() => {
    if (testId) {
      loadTestAndAnalyze();
    }
  }, [testId]);

  // Recalculate dynamic analysis when parameters change
  useEffect(() => {
    if (results && results.variants.length >= 2) {
      performDynamicAnalysis();
    }
  }, [statisticalParams, results]);

  const performDynamicAnalysis = () => {
    if (!results || results.variants.length < 2) return;

    // Get control and variant data
    const control = results.variants[0];
    const variant = results.variants[1];

    const { groupA, groupB } = convertABTestDataToAnalyzerFormat(
      { conversions: control.conversions, totalUsers: control.visitors },
      { conversions: variant.conversions, totalUsers: variant.visitors }
    );

    const analysis = analyzeData({
      groupA,
      groupB,
      significanceLevel: statisticalParams.significanceLevel,
      power: statisticalParams.power,
      confidenceLevel: statisticalParams.confidenceLevel
    });

    setDynamicAnalysis(analysis);
  };

  const loadTestAndAnalyze = async () => {
    if (!testId) return;
    
    setLoading(true);
    const testData = TestStorage.getTest(testId);
    
    if (!testData) {
      toast({
        title: "Error",
        description: "Test not found",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    setTest(testData);

    if (testData.data && testData.data.mappings.variantColumn && testData.data.mappings.conversionColumn) {
      const variantColumnIndex = testData.data.columns.indexOf(testData.data.mappings.variantColumn);
      const conversionColumnIndex = testData.data.columns.indexOf(testData.data.mappings.conversionColumn);
      
      const analysis = analyzeTestData(
        testData.data.rows,
        variantColumnIndex,
        conversionColumnIndex,
        testData.data.columns
      );
      
      setResults(analysis);
      
      // Update test with results
      const updatedTest = {
        ...testData,
        status: 'completed' as const,
        completedDate: new Date().toISOString(),
        results: {
          summary: {
            winningVariant: analysis.variants.reduce((prev, current) => 
              prev.conversionRate > current.conversionRate ? prev : current
            ).name,
            confidenceLevel: 95,
            pValue: analysis.analysis?.pValue || 0,
            isStatisticallySignificant: analysis.analysis?.isSignificant || false
          },
          variants: analysis.variants,
          uplift: {
            relative: analysis.analysis?.uplift || 0,
            absolute: analysis.variants.length > 1 ? 
              analysis.variants[1].conversionRate - analysis.variants[0].conversionRate : 0
          }
        }
      };
      
      TestStorage.saveTest(updatedTest);
      setTest(updatedTest);
    }

    setLoading(false);
  };

  const exportPDF = async () => {
    const element = document.getElementById('results-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${test?.name || 'test'}-results.pdf`);
      
      toast({
        title: "Success",
        description: "Report downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  const shareResults = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Success",
      description: "Link copied to clipboard"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!test || !results) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Results Available</h2>
        <p className="text-muted-foreground mb-4">
          Upload test data and configure analysis to see results
        </p>
        <Button asChild>
          <Link to={`/test/${testId}/upload`}>Upload Data</Link>
        </Button>
      </div>
    );
  }

  const winningVariant = results.variants.reduce((prev: any, current: any) => 
    prev.conversionRate > current.conversionRate ? prev : current
  );

  const chartData = results.variants.map((variant: any) => ({
    name: variant.name,
    conversionRate: (variant.conversionRate * 100).toFixed(2),
    conversions: variant.conversions,
    visitors: variant.visitors
  }));

  const trafficData = results.variants.map((variant: any, index: number) => ({
    name: variant.name,
    value: variant.visitors,
    color: index === 0 ? '#8884d8' : '#82ca9d'
  }));

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{test.name} - Results</h1>
          <p className="text-muted-foreground">Statistical analysis and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={shareResults}>
            <Share className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button onClick={exportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <div id="results-content" className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-primary mr-3" />
                <div>
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-muted-foreground">Winner</p>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The variant with the highest conversion rate</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-2xl font-bold">{winningVariant.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-accent mr-3" />
                <div>
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-muted-foreground">Uplift</p>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Percentage improvement of variant over control</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-2xl font-bold">
                    {results.analysis ? `${results.analysis.uplift.toFixed(1)}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-warning mr-3" />
                <div>
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-muted-foreground">P-Value</p>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Probability of seeing this result by chance. Lower is better (p &lt; {statisticalParams.significanceLevel} for significance)</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-2xl font-bold">
                    {dynamicAnalysis ? dynamicAnalysis.pValue.toFixed(4) : (results.analysis ? results.analysis.pValue.toFixed(4) : 'N/A')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                {(dynamicAnalysis?.isSignificant ?? results.analysis?.isSignificant) ? (
                  <CheckCircle className="h-8 w-8 text-success mr-3" />
                ) : (
                  <XCircle className="h-8 w-8 text-destructive mr-3" />
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Significance</p>
                  <p className="text-sm font-bold">
                    {(dynamicAnalysis?.isSignificant ?? results.analysis?.isSignificant) ? 'Significant' : 'Not Significant'}
                  </p>
                  <p className="text-xs text-muted-foreground">({(statisticalParams.confidenceLevel * 100).toFixed(0)}% confidence)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead>Visitors</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Conversion Rate</TableHead>
                  <TableHead>Confidence Interval</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.variants.map((variant: any, index: number) => (
                  <TableRow key={variant.name}>
                    <TableCell className="font-medium">
                      {variant.name}
                      {variant.name === winningVariant.name && (
                        <Badge className="ml-2" variant="default">Winner</Badge>
                      )}
                    </TableCell>
                    <TableCell>{variant.visitors.toLocaleString()}</TableCell>
                    <TableCell>{variant.conversions.toLocaleString()}</TableCell>
                    <TableCell>{(variant.conversionRate * 100).toFixed(2)}%</TableCell>
                    <TableCell>
                      {(variant.confidenceInterval.lower * 100).toFixed(2)}% - {(variant.confidenceInterval.upper * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      {index === 0 ? (
                        <Badge variant="secondary">Control</Badge>
                      ) : (
                        <Badge variant="outline">Variant</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Rate Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`${value}%`, 'Conversion Rate']}
                  />
                  <Bar dataKey="conversionRate" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Traffic Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trafficData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {trafficData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Statistical Analysis Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Statistical Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="significanceLevel">Significance Level (α)</Label>
                <Input
                  id="significanceLevel"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.20"
                  value={statisticalParams.significanceLevel}
                  onChange={(e) => setStatisticalParams(prev => ({
                    ...prev,
                    significanceLevel: parseFloat(e.target.value) || 0.05
                  }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Typically 0.05 (5%)</p>
              </div>
              
              <div>
                <Label htmlFor="power">Statistical Power (1-β)</Label>
                <Input
                  id="power"
                  type="number"
                  step="0.01"
                  min="0.50"
                  max="0.99"
                  value={statisticalParams.power}
                  onChange={(e) => setStatisticalParams(prev => ({
                    ...prev,
                    power: parseFloat(e.target.value) || 0.8
                  }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Typically 0.8 (80%)</p>
              </div>
              
              <div>
                <Label htmlFor="confidenceLevel">Confidence Level</Label>
                <Input
                  id="confidenceLevel"
                  type="number"
                  step="0.01"
                  min="0.80"
                  max="0.99"
                  value={statisticalParams.confidenceLevel}
                  onChange={(e) => setStatisticalParams(prev => ({
                    ...prev,
                    confidenceLevel: parseFloat(e.target.value) || 0.95
                  }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Typically 0.95 (95%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Statistical Analysis */}
        {dynamicAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle>Statistical Analysis & Interpretation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Test Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Data Type:</span>
                        <span className="capitalize">{dynamicAnalysis.dataType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Test Method:</span>
                        <span>{dynamicAnalysis.testDetails.method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Test Statistic:</span>
                        <span>{dynamicAnalysis.testStatistic.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">P-Value:</span>
                        <span>{dynamicAnalysis.pValue.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Effect Size:</span>
                        <span>{(dynamicAnalysis.effectSize * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Test Parameters</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Significance Level (α):</span> {(statisticalParams.significanceLevel * 100).toFixed(1)}%</p>
                      <p><span className="font-medium">Statistical Power:</span> {(statisticalParams.power * 100).toFixed(0)}%</p>
                      <p><span className="font-medium">Confidence Level:</span> {(statisticalParams.confidenceLevel * 100).toFixed(0)}%</p>
                      <p><span className="font-medium">Sample Size:</span> {results.analysis?.sampleSize?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Statistical Decision</h4>
                    <div className="space-y-2">
                      <div className={`p-3 rounded-lg ${dynamicAnalysis.isSignificant ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                        <p className="font-medium">
                          Decision: <span className={dynamicAnalysis.isSignificant ? 'text-success' : 'text-destructive'}>
                            {dynamicAnalysis.interpretation.decision === 'reject' ? 'Reject H₀' : 'Fail to Reject H₀'}
                          </span>
                        </p>
                        <p className="text-sm mt-1">{dynamicAnalysis.interpretation.recommendation}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Interpretation</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        <strong>Null Hypothesis (H₀):</strong> {dynamicAnalysis.testDetails.nullHypothesis}
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Alternative Hypothesis (H₁):</strong> {dynamicAnalysis.testDetails.alternativeHypothesis}
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg mt-3">
                        <p className="font-medium text-foreground">Plain Language:</p>
                        <p className="text-muted-foreground mt-1">{dynamicAnalysis.interpretation.plainLanguage}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Confidence Interval</h4>
                    <div className="text-sm">
                      <p>
                        <span className="font-medium">Difference:</span>{' '}
                        [{(dynamicAnalysis.confidenceInterval.lower * 100).toFixed(3)}%, {(dynamicAnalysis.confidenceInterval.upper * 100).toFixed(3)}%]
                      </p>
                      <p className="text-muted-foreground mt-1">
                        With {(statisticalParams.confidenceLevel * 100).toFixed(0)}% confidence, the true difference lies within this range.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <h4 className="font-semibold mb-2">Assumptions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {dynamicAnalysis.testDetails.assumptions.map((assumption, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{assumption}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}