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
import { analyzeData, convertABTestDataToAnalyzerFormat, performDynamicCheck, StatisticalResult } from '@/lib/dynamicStatisticalAnalyzer';
import { ABTest } from '@/types';
import { TrendingUp, Download, Share, Award, BarChart3, CheckCircle, XCircle, HelpCircle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function TestResults() {
  const { testId } = useParams();
  const { toast } = useToast();
  const [test, setTest] = useState<ABTest | null>(null);
  const [results, setResults] = useState<any>(null);
  const [dynamicAnalysis, setDynamicAnalysis] = useState<(StatisticalResult & { continuousMetrics?: any }) | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dynamic statistical parameters - update based on test configuration
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

    try {
      const analysis = performDynamicCheck(
        results.variants,
        statisticalParams
      );
      setDynamicAnalysis(analysis);
    } catch (error) {
      console.error('Dynamic analysis error:', error);
    }
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
    
    // Update statistical parameters from test configuration
    setStatisticalParams({
      significanceLevel: testData.alpha || 0.05,
      power: testData.power || 0.8,
      confidenceLevel: 0.95
    });

    if (testData.data && testData.data.mappings.variantColumn && testData.data.mappings.conversionColumn) {
      const variantColumnIndex = testData.data.columns.indexOf(testData.data.mappings.variantColumn);
      const conversionColumnIndex = testData.data.columns.indexOf(testData.data.mappings.conversionColumn);
      
      console.log('Test alpha:', testData.alpha, 'Test power:', testData.power);
      console.log('Using significance level:', testData.alpha || 0.05);
      
      const analysis = analyzeTestData(
        testData.data.rows,
        variantColumnIndex,
        conversionColumnIndex,
        testData.data.columns,
        {
          significanceLevel: testData.alpha || 0.05,
          power: testData.power || 0.8,
          confidenceLevel: 0.95
        }
      );
      
      setResults(analysis);
      
    // Update test with results - Use dynamic analysis for winner determination
    const hasContinuousData = analysis.variants.some(v => v.continuousValues && v.continuousValues.length > 0);
    
    let winningVariant: string;
    if (hasContinuousData) {
      // For continuous data, determine winner based on statistical significance and mean values
      if (analysis.analysis?.isSignificant) {
        const variantMeans = analysis.variants.map(v => ({
          name: v.name,
          mean: v.continuousValues ? v.continuousValues.reduce((a, b) => a + b, 0) / v.continuousValues.length : 0
        }));
        winningVariant = variantMeans.reduce((prev, current) => 
          current.mean > prev.mean ? current : prev
        ).name;
      } else {
        winningVariant = 'No significant difference';
      }
    } else {
      // For categorical data, use conversion rate comparison only if significant
      if (analysis.analysis?.isSignificant) {
        winningVariant = analysis.variants.reduce((prev, current) => 
          current.conversionRate > prev.conversionRate ? prev : current
        ).name;
      } else {
        winningVariant = 'No significant difference';
      }
    }

    const updatedTest = {
      ...testData,
      status: 'completed' as const,
      completedDate: new Date().toISOString(),
      results: {
        summary: {
          winningVariant,
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

  // Enhanced winner determination for both continuous and categorical data
  const winningVariant = (() => {
    if (dynamicAnalysis?.dataType === 'continuous') {
      // For continuous data, winner is determined by higher mean if significant
      if (dynamicAnalysis.isSignificant && dynamicAnalysis.continuousMetrics) {
        return dynamicAnalysis.continuousMetrics.groupA.mean > dynamicAnalysis.continuousMetrics.groupB.mean 
          ? results.variants[0] 
          : results.variants[1];
      }
    }
    // Default to highest conversion rate for binary/categorical data
    return results.variants.reduce((prev: any, current: any) => 
      prev.conversionRate > current.conversionRate ? prev : current
    );
  })();

  const chartData = results.variants.map((variant: any, index: number) => ({
    name: variant.name,
    conversionRate: dynamicAnalysis?.dataType === 'continuous' && dynamicAnalysis.continuousMetrics ? 
      (index === 0 ? dynamicAnalysis.continuousMetrics.groupA.mean : dynamicAnalysis.continuousMetrics.groupB.mean).toFixed(2) :
      (variant.conversionRate * 100).toFixed(2),
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

      {/* Statistical Parameters Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Statistical Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Significance Level (α)</Label>
              <div className="text-2xl font-bold text-primary">
                {statisticalParams.significanceLevel.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Type I error threshold</p>
            </div>
            <div>
              <Label>Statistical Power</Label>
              <div className="text-2xl font-bold text-primary">
                {(statisticalParams.power * 100).toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">Type II error protection</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    {(() => {
                      if (dynamicAnalysis?.dataType === 'continuous' && dynamicAnalysis.continuousMetrics) {
                        // Calculate uplift for continuous data: (treatment - control) / control * 100
                        const controlMean = dynamicAnalysis.continuousMetrics.groupA.mean;
                        const treatmentMean = dynamicAnalysis.continuousMetrics.groupB.mean;
                        const uplift = controlMean !== 0 ? ((treatmentMean - controlMean) / controlMean * 100) : 0;
                        return `${uplift.toFixed(1)}%`;
                      } else if (results.analysis) {
                        return `${results.analysis.uplift.toFixed(1)}%`;
                      }
                      return 'N/A';
                    })()}
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
                  {dynamicAnalysis?.dataType !== 'continuous' && (
                    <TableHead>Conversions</TableHead>
                  )}
                  {dynamicAnalysis?.dataType === 'continuous' ? (
                    <TableHead>{test?.data?.mappings.conversionColumn} - Mean Rate</TableHead>
                  ) : (
                    <TableHead>{test?.data?.mappings.conversionColumn} - Conversion Rate</TableHead>
                  )}
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
                    {dynamicAnalysis?.dataType !== 'continuous' && (
                      <TableCell>{variant.conversions.toLocaleString()}</TableCell>
                    )}
                     {dynamicAnalysis?.dataType !== 'continuous' && (
                       <TableCell>
                         {`${(variant.conversionRate * 100).toFixed(2)}%`}
                       </TableCell>
                     )}
                     {dynamicAnalysis?.dataType === 'continuous' && (
                       <TableCell>
                         {dynamicAnalysis.continuousMetrics 
                           ? `${(index === 0 ? dynamicAnalysis.continuousMetrics.groupA.mean : dynamicAnalysis.continuousMetrics.groupB.mean).toFixed(2)}`
                           : 'N/A'
                         }
                       </TableCell>
                     )}
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
              <CardTitle>
                {dynamicAnalysis?.dataType === 'continuous' 
                  ? `${test?.data?.mappings.conversionColumn} - Mean Value Comparison`
                  : `${test?.data?.mappings.conversionColumn} - Conversion Rate Comparison`
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ 
                    value: dynamicAnalysis?.dataType === 'continuous' ? 'Mean Value' : '% Conversion Rate',
                    angle: -90,
                    position: 'insideLeft'
                  }} />
                  <Tooltip 
                    formatter={(value: any) => [
                      dynamicAnalysis?.dataType === 'continuous' ? value : `${value}%`,
                      dynamicAnalysis?.dataType === 'continuous' ? 'Mean Value' : 'Conversion Rate'
                    ]}
                  />
                  <Bar dataKey="conversionRate" fill="hsl(var(--primary))">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList 
                      dataKey="conversionRate" 
                      position="top" 
                      formatter={(value: any) => 
                        dynamicAnalysis?.dataType === 'continuous' ? value : `${value}%`
                      }
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trafficData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
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

        {/* Dynamic Statistical Analysis */}
        {dynamicAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle>Dynamic Statistical Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Statistical Results</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Test Method:</span>
                        <span>{dynamicAnalysis.testDetails.method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Data Type:</span>
                        <span className="capitalize">{dynamicAnalysis.dataType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">P-Value:</span>
                        <span>{dynamicAnalysis.pValue.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Effect Size:</span>
                        <span>{(dynamicAnalysis.effectSize * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Significance:</span>
                        <span className={dynamicAnalysis.isSignificant ? 'text-success' : 'text-destructive'}>
                          {dynamicAnalysis.isSignificant ? 'Significant' : 'Not Significant'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Metrics Summary</h4>
                    <div className="space-y-2">
                      {results.variants.map((variant: any, index: number) => (
                        <div key={variant.name} className="text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{variant.name}:</span>
                            <div className="text-right">
                              <div>{(variant.conversionRate * 100).toFixed(2)}% conversion</div>
                              <div className="text-muted-foreground text-xs">
                                {variant.conversions}/{variant.visitors} users
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                     </div>
                   </div>
                 </div>
               </div>
               
               {/* Hypothesis Decision Statement */}
               <div className="mt-6 p-4 bg-muted rounded-lg">
                 <h4 className="font-semibold mb-2">Hypothesis Decision</h4>
                 <p className="text-sm">
                   We <strong>
                     {(dynamicAnalysis?.pValue && dynamicAnalysis.pValue < statisticalParams.significanceLevel) ? 'reject' : 'fail to reject'}
                   </strong> the null hypothesis based on the p-value ({dynamicAnalysis?.pValue?.toFixed(4) || 'N/A'}) 
                   compared to the significance level ({statisticalParams.significanceLevel.toFixed(2)}).
                 </p>
               </div>
             </CardContent>
           </Card>
         )}
       </div>
     </div>
   );
 }