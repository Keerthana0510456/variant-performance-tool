export interface ABTest {
  id: string;
  name: string;
  hypothesis: {
    h0: string;
    h1: string;
  };
  tailType: 'one-tailed' | 'two-tailed';
  expectedConversionRates: {
    control: number;
    variant: number;
  };
  trafficPerDay: number;
  sampleSize: number;
  estimatedDuration: number;
  status: 'draft' | 'running' | 'completed';
  createdDate: string;
  completedDate?: string;
  data?: TestData;
  results?: TestResults;
}

export interface TestData {
  fileName: string;
  columns: string[];
  rows: any[][];
  mappings: {
    variantColumn?: string;
    conversionColumn?: string;
    customerIdColumn?: string;
    dateColumn?: string;
  };
}

export interface TestResults {
  summary: {
    winningVariant: string;
    confidenceLevel: number;
    pValue: number;
    isStatisticallySignificant: boolean;
  };
  variants: VariantResult[];
  uplift: {
    relative: number;
    absolute: number;
  };
}

export interface VariantResult {
  name: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  continuousValues?: number[];
}

export interface StatisticalAnalysis {
  sampleSize: number;
  pValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  uplift: number;
  isSignificant: boolean;
}