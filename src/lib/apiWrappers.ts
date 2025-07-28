/**
 * API Wrapper functions for backend Python statistical analysis
 * These functions maintain the same interface as the TypeScript functions
 * but call the backend Python APIs when connected
 */

import { StatisticalAnalysis, VariantResult } from '@/types';

// Configuration for backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface BackendConfig {
  useBackend: boolean;
  apiBaseUrl: string;
}

// Global configuration - can be set when backend is connected
let backendConfig: BackendConfig = {
  useBackend: false,
  apiBaseUrl: API_BASE_URL
};

// Function to configure backend usage
export function configureBackend(useBackend: boolean, apiBaseUrl?: string) {
  backendConfig.useBackend = useBackend;
  if (apiBaseUrl) {
    backendConfig.apiBaseUrl = apiBaseUrl;
  }
}

// API call helper
async function callAPI(endpoint: string, data: any) {
  const response = await fetch(`${backendConfig.apiBaseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Wrapper for calculateSampleSize
export async function calculateSampleSize(
  p1: number,
  p2: number,
  alpha: number = 0.05,
  beta: number = 0.20,
  tailType: 'one-tailed' | 'two-tailed' = 'two-tailed'
): Promise<number> {
  if (backendConfig.useBackend) {
    const result = await callAPI('/api/calculate-sample-size', {
      p1,
      p2,
      alpha,
      beta,
      tail_type: tailType
    });
    return result.sample_size;
  } else {
    // Fallback to local TypeScript function
    const { calculateSampleSize: localFn } = await import('./statistics');
    return localFn(p1, p2, alpha, beta, tailType);
  }
}

// Wrapper for calculateTestDuration
export async function calculateTestDuration(
  sampleSize: number,
  trafficPerDay: number
): Promise<number> {
  if (backendConfig.useBackend) {
    const result = await callAPI('/api/calculate-test-duration', {
      sample_size: sampleSize,
      traffic_per_day: trafficPerDay
    });
    return result.duration;
  } else {
    // Fallback to local TypeScript function
    const { calculateTestDuration: localFn } = await import('./statistics');
    return localFn(sampleSize, trafficPerDay);
  }
}

// Wrapper for twoProportionZTest
export async function twoProportionZTest(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  tailType: 'one-tailed' | 'two-tailed' = 'two-tailed'
): Promise<StatisticalAnalysis> {
  if (backendConfig.useBackend) {
    const result = await callAPI('/api/two-proportion-z-test', {
      x1,
      n1,
      x2,
      n2,
      tail_type: tailType
    });
    
    return {
      sampleSize: result.sample_size,
      pValue: result.p_value,
      confidenceInterval: result.confidence_interval,
      uplift: result.uplift,
      isSignificant: result.is_significant
    };
  } else {
    // Fallback to local TypeScript function
    const { twoProportionZTest: localFn } = await import('./statistics');
    return localFn(x1, n1, x2, n2, tailType);
  }
}

// Wrapper for calculateConfidenceInterval
export async function calculateConfidenceInterval(
  conversions: number,
  sampleSize: number,
  confidenceLevel: number = 0.95
): Promise<{ lower: number; upper: number }> {
  if (backendConfig.useBackend) {
    const result = await callAPI('/api/calculate-confidence-interval', {
      conversions,
      sample_size: sampleSize,
      confidence_level: confidenceLevel
    });
    return result;
  } else {
    // Fallback to local TypeScript function
    const { calculateConfidenceInterval: localFn } = await import('./statistics');
    return localFn(conversions, sampleSize, confidenceLevel);
  }
}

// Wrapper for analyzeTestData
export async function analyzeTestData(
  data: any[][],
  variantColumn: number,
  conversionColumn: number,
  columns: string[],
  statisticalParams?: {
    significanceLevel?: number;
    power?: number;
    confidenceLevel?: number;
  }
): Promise<{ variants: VariantResult[]; analysis: StatisticalAnalysis | null }> {
  if (backendConfig.useBackend) {
    const result = await callAPI('/api/analyze-test-data', {
      data,
      variant_column: variantColumn,
      conversion_column: conversionColumn,
      columns,
      statistical_params: statisticalParams
    });
    
    return {
      variants: result.variants,
      analysis: result.analysis
    };
  } else {
    // Fallback to local TypeScript function
    const { analyzeTestData: localFn } = await import('./statistics');
    return localFn(data, variantColumn, conversionColumn, columns, statisticalParams);
  }
}

// Wrapper for dynamic statistical analyzer functions
export async function analyzeData(inputs: {
  groupA: number[];
  groupB: number[];
  significanceLevel: number;
  power: number;
  confidenceLevel: number;
}): Promise<any> {
  if (backendConfig.useBackend) {
    return await callAPI('/api/analyze-data', inputs);
  } else {
    // Fallback to local TypeScript function
    const { analyzeData: localFn } = await import('./dynamicStatisticalAnalyzer');
    return localFn(inputs);
  }
}

// Wrapper for convertABTestDataToAnalyzerFormat
export async function convertABTestDataToAnalyzerFormat(
  groupAData: { conversions: number; totalUsers: number; continuousValues?: number[] },
  groupBData: { conversions: number; totalUsers: number; continuousValues?: number[] }
): Promise<{ groupA: number[]; groupB: number[] }> {
  if (backendConfig.useBackend) {
    const result = await callAPI('/api/convert-ab-test-data', {
      group_a_data: groupAData,
      group_b_data: groupBData
    });
    return {
      groupA: result.group_a,
      groupB: result.group_b
    };
  } else {
    // Fallback to local TypeScript function
    const { convertABTestDataToAnalyzerFormat: localFn } = await import('./dynamicStatisticalAnalyzer');
    return localFn(groupAData, groupBData);
  }
}

// Wrapper for performDynamicCheck
export async function performDynamicCheck(
  variants: Array<{
    name: string;
    visitors: number;
    conversions: number;
    conversionRate: number;
    continuousValues?: number[];
  }>,
  params: { significanceLevel: number; power: number; confidenceLevel: number }
): Promise<any> {
  if (backendConfig.useBackend) {
    return await callAPI('/api/perform-dynamic-check', {
      variants,
      params
    });
  } else {
    // Fallback to local TypeScript function
    const { performDynamicCheck: localFn } = await import('./dynamicStatisticalAnalyzer');
    return localFn(variants, params);
  }
}

// Wrapper for detectDataType
export async function detectDataType(data: number[]): Promise<'continuous' | 'binary' | 'categorical'> {
  if (backendConfig.useBackend) {
    const result = await callAPI('/api/detect-data-type', { data });
    return result.data_type;
  } else {
    // Fallback to local TypeScript function
    const { detectDataType: localFn } = await import('./dynamicStatisticalAnalyzer');
    return localFn(data);
  }
}

// Wrapper for calculateContinuousMetrics
export async function calculateContinuousMetrics(data: number[]): Promise<{
  mean: number;
  standardDeviation: number;
  min: number;
  max: number;
  median: number;
  count: number;
}> {
  if (backendConfig.useBackend) {
    const result = await callAPI('/api/calculate-continuous-metrics', { data });
    return result;
  } else {
    // Fallback to local TypeScript function
    const { calculateContinuousMetrics: localFn } = await import('./dynamicStatisticalAnalyzer');
    return localFn(data);
  }
}

// Export backend configuration functions
export { backendConfig };