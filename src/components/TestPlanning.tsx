import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestStorage } from '@/lib/storage';
import { calculateSampleSize, calculateTestDuration } from '@/lib/statistics';
import { ABTest } from '@/types';
import { Calculator, Save, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestPlanningProps {
  testId?: string;
}

export function TestPlanning({ testId }: TestPlanningProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(!testId);

  const [formData, setFormData] = useState({
    name: '',
    h0: '',
    h1: '',
    tailType: 'two-tailed' as 'one-tailed' | 'two-tailed',
    controlRate: 0.1,
    variantRate: 0.12,
    trafficPerDay: 1000,
    alpha: 0.05, // Significance level (α)
    power: 0.8,  // Statistical power (1-β)
  });

  const [calculatedMetrics, setCalculatedMetrics] = useState({
    sampleSize: 0,
    estimatedDuration: 0,
  });

  useEffect(() => {
    if (testId) {
      const existingTest = TestStorage.getTest(testId);
      if (existingTest) {
        setFormData({
          name: existingTest.name,
          h0: existingTest.hypothesis.h0,
          h1: existingTest.hypothesis.h1,
          tailType: existingTest.tailType,
          controlRate: existingTest.expectedConversionRates.control,
          variantRate: existingTest.expectedConversionRates.variant,
          trafficPerDay: existingTest.trafficPerDay,
          alpha: 0.05, // Default values for new fields
          power: 0.8,
        });
      }
    }
  }, [testId]);

  useEffect(() => {
    if (formData.controlRate > 0 && formData.variantRate > 0 && formData.trafficPerDay > 0) {
      const sampleSize = calculateSampleSize(
        formData.controlRate,
        formData.variantRate,
        formData.alpha,
        1 - formData.power, // Convert power to beta (Type II error)
        formData.tailType
      );
      const duration = calculateTestDuration(sampleSize, formData.trafficPerDay);
      
      setCalculatedMetrics({
        sampleSize,
        estimatedDuration: duration,
      });
    }
  }, [formData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Enhanced validation
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test name",
        variant: "destructive"
      });
      return;
    }

    if (!formData.h0.trim() || !formData.h1.trim()) {
      toast({
        title: "Error", 
        description: "Both hypotheses (H0 and H1) are required",
        variant: "destructive"
      });
      return;
    }

    if (formData.controlRate <= 0 || formData.controlRate >= 1) {
      toast({
        title: "Error",
        description: "Control conversion rate must be between 0% and 100%",
        variant: "destructive"
      });
      return;
    }

    if (formData.variantRate <= 0 || formData.variantRate >= 1) {
      toast({
        title: "Error",
        description: "Variant conversion rate must be between 0% and 100%", 
        variant: "destructive"
      });
      return;
    }

    if (formData.trafficPerDay <= 0) {
      toast({
        title: "Error",
        description: "Traffic per day must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    const test: ABTest = {
      id: testId || TestStorage.generateId(),
      name: formData.name,
      hypothesis: {
        h0: formData.h0,
        h1: formData.h1,
      },
      tailType: formData.tailType,
      expectedConversionRates: {
        control: formData.controlRate,
        variant: formData.variantRate,
      },
      trafficPerDay: formData.trafficPerDay,
      sampleSize: calculatedMetrics.sampleSize,
      estimatedDuration: calculatedMetrics.estimatedDuration,
      status: 'draft',
      createdDate: testId ? TestStorage.getTest(testId)?.createdDate || new Date().toISOString() : new Date().toISOString(),
    };

    TestStorage.saveTest(test);
    
    toast({
      title: "Success",
      description: `Test ${testId ? 'updated' : 'created'} successfully`,
    });

    if (!testId) {
      navigate(`/test/${test.id}`);
    } else {
      setIsEditing(false);
    }
  };

  const upliftPercentage = formData.controlRate > 0 
    ? ((formData.variantRate - formData.controlRate) / formData.controlRate * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {testId ? (isEditing ? 'Edit Test' : 'Test Details') : 'Plan New A/B Test'}
          </h1>
          <p className="text-muted-foreground">
            {testId ? 'View or modify test configuration' : 'Configure your experiment parameters'}
          </p>
        </div>
        {testId && !isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            Edit Test
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="testName">Test Name</Label>
              <Input
                id="testName"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Email Subject Line Test"
                disabled={!isEditing && !!testId}
              />
            </div>

            <div>
              <Label htmlFor="h0">Null Hypothesis (H0) *</Label>
              <Textarea
                id="h0"
                value={formData.h0}
                onChange={(e) => handleInputChange('h0', e.target.value)}
                placeholder="e.g., There is no difference in conversion rates between variants"
                disabled={!isEditing && !!testId}
                required
              />
            </div>

            <div>
              <Label htmlFor="h1">Alternative Hypothesis (H1) *</Label>
              <Textarea
                id="h1"
                value={formData.h1}
                onChange={(e) => handleInputChange('h1', e.target.value)}
                placeholder="e.g., Variant B has a higher conversion rate than the control"
                disabled={!isEditing && !!testId}
                required
              />
            </div>

            <div>
              <Label>Tail Type</Label>
              <Select 
                value={formData.tailType} 
                onValueChange={(value) => handleInputChange('tailType', value)}
                disabled={!isEditing && !!testId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="two-tailed">Two-tailed</SelectItem>
                  <SelectItem value="one-tailed">One-tailed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="alpha">Significance Level (α)</Label>
              <Input
                id="alpha"
                type="number"
                step="0.01"
                min="0.01"
                max="0.20"
                value={formData.alpha}
                onChange={(e) => handleInputChange('alpha', parseFloat(e.target.value))}
                disabled={!isEditing && !!testId}
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
                value={formData.power}
                onChange={(e) => handleInputChange('power', parseFloat(e.target.value))}
                disabled={!isEditing && !!testId}
              />
              <p className="text-xs text-muted-foreground mt-1">Typically 0.8 (80%)</p>
            </div>
          </CardContent>
        </Card>

        {/* Expected Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Expected Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="controlRate">Control Conversion Rate (%)</Label>
              <Input
                id="controlRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.controlRate * 100}
                onChange={(e) => handleInputChange('controlRate', parseFloat(e.target.value) / 100)}
                disabled={!isEditing && !!testId}
              />
            </div>

            <div>
              <Label htmlFor="variantRate">Expected Variant Conversion Rate (%)</Label>
              <Input
                id="variantRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.variantRate * 100}
                onChange={(e) => handleInputChange('variantRate', parseFloat(e.target.value) / 100)}
                disabled={!isEditing && !!testId}
              />
            </div>

            <div>
              <Label htmlFor="trafficPerDay">Traffic per Day</Label>
              <Input
                id="trafficPerDay"
                type="number"
                min="1"
                value={formData.trafficPerDay}
                onChange={(e) => handleInputChange('trafficPerDay', parseInt(e.target.value))}
                disabled={!isEditing && !!testId}
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Calculator className="mr-2 h-4 w-4" />
                <span className="font-medium">Expected Uplift</span>
              </div>
              <p className="text-2xl font-bold text-primary">{upliftPercentage}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Calculated Metrics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calculated Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="text-sm font-medium text-primary mb-1">Required Sample Size</div>
                <div className="text-2xl font-bold">{calculatedMetrics.sampleSize.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">per variant ({(formData.alpha * 100).toFixed(0)}% significance, {(formData.power * 100).toFixed(0)}% power)</div>
              </div>
              
              <div className="bg-accent/10 p-4 rounded-lg">
                <div className="text-sm font-medium text-accent mb-1">Estimated Duration</div>
                <div className="text-2xl font-bold">{calculatedMetrics.estimatedDuration}</div>
                <div className="text-sm text-muted-foreground">days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {(isEditing || !testId) && (
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {testId ? 'Update Test' : 'Save Test'}
          </Button>
        )}
        
        {testId && (
          <Button variant="outline" asChild>
            <a href={`/test/${testId}/upload`}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Upload Data
            </a>
          </Button>
        )}
        
        {!testId && (
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}