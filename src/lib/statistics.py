# """
# Python equivalent of statistics.ts
# Statistical functions for A/B testing including sample size calculation, z-tests, and confidence intervals
# """

import numpy as np
import scipy.stats as stats
from typing import List, Dict, Any, Optional, Tuple, Union


def calculate_sample_size(
    p1: float,  # Control conversion rate
    p2: float,  # Variant conversion rate
    alpha: float = 0.05,  # Significance level
    beta: float = 0.20,  # Type II error (power = 1 - beta = 0.80)
    tail_type: str = 'two-tailed'
) -> int:
    """Calculate sample size for two-proportion z-test"""
    # Calculate critical values based on actual alpha and beta values
    if tail_type == 'two-tailed':
        z_alpha = stats.norm.ppf(1 - alpha/2)
    else:
        z_alpha = stats.norm.ppf(1 - alpha)
    
    z_beta = stats.norm.ppf(1 - beta)
    
    pooled_p = (p1 + p2) / 2
    effect = abs(p2 - p1)
    
    numerator = (z_alpha * np.sqrt(2 * pooled_p * (1 - pooled_p)) + 
                z_beta * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2)))**2
    denominator = effect**2
    
    return int(np.ceil(numerator / denominator))


def calculate_test_duration(sample_size: int, traffic_per_day: int) -> int:
    """Calculate estimated test duration"""
    return int(np.ceil((sample_size * 2) / traffic_per_day))  # *2 for both control and variant


def two_proportion_z_test(
    x1: int,  # Control conversions
    n1: int,  # Control sample size
    x2: int,  # Variant conversions
    n2: int,  # Variant sample size
    tail_type: str = 'two-tailed'
) -> Dict[str, Any]:
    """Perform two-proportion z-test"""
    p1 = x1 / n1
    p2 = x2 / n2
    p_pool = (x1 + x2) / (n1 + n2)
    
    # Calculate z-score
    standard_error = np.sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2))
    z_score = (p2 - p1) / standard_error
    
    # Calculate p-value
    if tail_type == 'two-tailed':
        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
    else:
        p_value = 1 - stats.norm.cdf(z_score)
    
    # Calculate confidence interval for difference
    se_diff = np.sqrt((p1 * (1 - p1) / n1) + (p2 * (1 - p2) / n2))
    margin_of_error = 1.96 * se_diff  # 95% confidence
    diff = p2 - p1
    
    confidence_interval = {
        'lower': diff - margin_of_error,
        'upper': diff + margin_of_error
    }
    
    # Calculate uplift
    uplift = ((p2 - p1) / p1) * 100 if p1 != 0 else 0
    
    return {
        'sample_size': n1 + n2,
        'p_value': p_value,
        'confidence_interval': confidence_interval,
        'uplift': uplift,
        'is_significant': p_value < 0.05
    }


def calculate_confidence_interval(
    conversions: int,
    sample_size: int,
    confidence_level: float = 0.95
) -> Dict[str, float]:
    """Calculate confidence interval for a proportion"""
    p = conversions / sample_size
    z = 1.96 if confidence_level == 0.95 else 1.645
    standard_error = np.sqrt((p * (1 - p)) / sample_size)
    margin_of_error = z * standard_error
    
    return {
        'lower': max(0, p - margin_of_error),
        'upper': min(1, p + margin_of_error)
    }


def analyze_test_data(
    data: List[List[Any]],
    variant_column: int,
    conversion_column: int,
    columns: List[str],
    statistical_params: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """Analyze A/B test data using statistical analysis"""
    try:
        variant_column_name = columns[variant_column]
        conversion_column_name = columns[conversion_column]
        
        # Check if we have continuous data
        conversion_values = [row[conversion_column] for row in data[1:] 
                           if row[conversion_column] is not None]
        is_continuous = any(
            isinstance(val, (int, float)) and val != 0 and val != 1 
            for val in conversion_values
        )
        
        if is_continuous:
            # Handle continuous data
            variant_groups = {}
            
            for row in data[1:]:
                variant = row[variant_column]
                try:
                    value = float(row[conversion_column])
                    if not np.isnan(value):
                        if variant not in variant_groups:
                            variant_groups[variant] = []
                        variant_groups[variant].append(value)
                except (ValueError, TypeError):
                    continue
            
            variant_names = list(variant_groups.keys())
            if len(variant_names) < 2:
                raise ValueError('Need at least 2 variants for comparison')
            
            # Prepare variants data
            variants = []
            for name in variant_names:
                variants.append({
                    'name': name,
                    'visitors': len(variant_groups[name]),
                    'conversions': 0,  # Not applicable for continuous data
                    'conversion_rate': 0,  # Not applicable for continuous data
                    'confidence_interval': {'lower': 0, 'upper': 0},
                    'continuous_values': variant_groups[name]
                })
            
            # Perform t-test for continuous data
            if len(variant_names) >= 2:
                group_a = variant_groups[variant_names[0]]
                group_b = variant_groups[variant_names[1]]
                
                t_stat, p_value = stats.ttest_ind(group_a, group_b, equal_var=False)
                
                mean_diff = np.mean(group_a) - np.mean(group_b)
                pooled_std = np.sqrt((np.var(group_a, ddof=1) + np.var(group_b, ddof=1)) / 2)
                cohens_d = mean_diff / pooled_std if pooled_std != 0 else 0
                
                # Confidence interval for difference
                se = np.sqrt(np.var(group_a, ddof=1)/len(group_a) + np.var(group_b, ddof=1)/len(group_b))
                df = min(len(group_a), len(group_b)) - 1
                t_critical = stats.t.ppf(0.975, df)
                margin_of_error = t_critical * se
                
                analysis = {
                    'sample_size': sum(len(variant_groups[name]) for name in variant_names),
                    'p_value': p_value,
                    'confidence_interval': {
                        'lower': mean_diff - margin_of_error,
                        'upper': mean_diff + margin_of_error
                    },
                    'uplift': 0,  # Calculate based on means for continuous data
                    'is_significant': p_value < (statistical_params.get('significance_level', 0.05) if statistical_params else 0.05)
                }
            else:
                analysis = None
            
            return {'variants': variants, 'analysis': analysis}
        
        else:
            # Handle categorical/binary data
            variant_groups = {}
            
            for row in data:
                variant = row[variant_column]
                if variant not in variant_groups:
                    variant_groups[variant] = []
                variant_groups[variant].append(row)
            
            variants = []
            for name, rows in variant_groups.items():
                visitors = len(rows)
                conversions = sum(1 for row in rows 
                                if row[conversion_column] in ['Yes', '1', 1, True])
                
                conversion_rate = conversions / visitors if visitors > 0 else 0
                confidence_interval = calculate_confidence_interval(conversions, visitors)
                
                variants.append({
                    'name': name,
                    'visitors': visitors,
                    'conversions': conversions,
                    'conversion_rate': conversion_rate,
                    'confidence_interval': confidence_interval
                })
            
            # Perform z-test for binary data
            analysis = None
            control = next((v for v in variants if 'control' in v['name'].lower()), None)
            variant = next((v for v in variants if 'control' not in v['name'].lower()), None)
            
            if control and variant:
                analysis = two_proportion_z_test(
                    control['conversions'],
                    control['visitors'],
                    variant['conversions'],
                    variant['visitors']
                )
            
            return {'variants': variants, 'analysis': analysis}
    
    except Exception as e:
        print(f"Analysis error: {e}")
        # Fallback analysis would go here
        return {'variants': [], 'analysis': None}

# """