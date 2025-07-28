# """
# Python equivalent of dynamicStatisticalAnalyzer.ts
# Dynamic statistical analyzer that automatically detects data types and applies appropriate tests
# """

import numpy as np
import scipy.stats as stats
from typing import List, Dict, Any, Optional, Union, Literal
from dataclasses import dataclass


DataType = Literal['continuous', 'binary', 'categorical']
TestType = Literal['t-test', 'z-test', 'chi-squared']


@dataclass
class StatisticalInputs:
    group_a: List[float]
    group_b: List[float]
    significance_level: float
    power: float
    confidence_level: float


@dataclass
class StatisticalResult:
    data_type: DataType
    test_type: TestType
    test_statistic: float
    p_value: float
    confidence_interval: Dict[str, float]
    effect_size: float
    is_significant: bool
    interpretation: Dict[str, str]
    test_details: Dict[str, Any]


def mean(data: List[float]) -> float:
    """Calculate mean of data"""
    return np.mean(data)


def variance(data: List[float]) -> float:
    """Calculate variance of data"""
    return np.var(data, ddof=1)


def standard_deviation(data: List[float]) -> float:
    """Calculate standard deviation of data"""
    return np.std(data, ddof=1)


def detect_data_type(data: List[float]) -> DataType:
    """Detect data type from numerical data"""
    unique_values = list(set(data))
    
    # Check if binary (only 0s and 1s)
    if all(val == 0 or val == 1 for val in unique_values):
        return 'binary'
    
    # Check if categorical (limited discrete values)
    if len(unique_values) <= 10 and all(float(val).is_integer() for val in unique_values):
        return 'categorical'
    
    return 'continuous'


def welch_t_test(group_a: List[float], group_b: List[float], 
                alpha: float, confidence_level: float) -> StatisticalResult:
    """Perform Welch's t-test for continuous data"""
    mean_a = np.mean(group_a)
    mean_b = np.mean(group_b)
    var_a = np.var(group_a, ddof=1)
    var_b = np.var(group_b, ddof=1)
    n_a = len(group_a)
    n_b = len(group_b)
    
    # Welch's t-statistic
    pooled_se = np.sqrt(var_a / n_a + var_b / n_b)
    t = (mean_a - mean_b) / pooled_se
    
    # Welch-Satterthwaite degrees of freedom
    df = (var_a / n_a + var_b / n_b)**2 / ((var_a / n_a)**2 / (n_a - 1) + (var_b / n_b)**2 / (n_b - 1))
    
    # P-value (two-tailed)
    p_value = 2 * (1 - stats.t.cdf(abs(t), df))
    
    # Effect size (Cohen's d)
    pooled_sd = np.sqrt(((n_a - 1) * var_a + (n_b - 1) * var_b) / (n_a + n_b - 2))
    cohens_d = (mean_a - mean_b) / pooled_sd
    
    # Confidence interval for difference
    t_critical = stats.t.ppf(1 - (1 - confidence_level) / 2, df)
    margin_of_error = t_critical * pooled_se
    diff = mean_a - mean_b
    
    is_significant = p_value < alpha
    winner = 'Group A' if mean_a > mean_b else 'Group B' if is_significant else None
    
    return StatisticalResult(
        data_type='continuous',
        test_type='t-test',
        test_statistic=t,
        p_value=p_value,
        confidence_interval={
            'lower': diff - margin_of_error,
            'upper': diff + margin_of_error
        },
        effect_size=cohens_d,
        is_significant=is_significant,
        interpretation={
            'decision': 'reject' if is_significant else 'fail_to_reject',
            'plain_language': (
                f"There is a statistically significant difference between the groups (p = {p_value:.4f}). "
                f"Group A mean ({mean_a:.2f}) {'is significantly higher than' if mean_a > mean_b else 'is significantly lower than'} "
                f"Group B mean ({mean_b:.2f}). Winner: {winner}."
            ) if is_significant else (
                f"There is no statistically significant difference between the groups (p = {p_value:.4f}). "
                f"The difference between Group A mean ({mean_a:.2f}) and Group B mean ({mean_b:.2f}) could be due to random variation."
            ),
            'recommendation': (
                f"Reject the null hypothesis. {winner} has a statistically significant advantage."
            ) if is_significant else (
                "Fail to reject the null hypothesis. Consider increasing sample size or the effect may not be meaningful."
            )
        },
        test_details={
            'null_hypothesis': 'There is no difference in means between Group A and Group B',
            'alternative_hypothesis': 'There is a difference in means between Group A and Group B',
            'assumptions': ['Data is normally distributed', 'Observations are independent', 'Equal or unequal variances (Welch correction applied)'],
            'method': "Welch's Two-Sample t-Test"
        }
    )


def two_proportion_z_test(group_a: List[float], group_b: List[float], 
                         alpha: float, confidence_level: float) -> StatisticalResult:
    """Perform two-proportion z-test for binary data"""
    n_a = len(group_a)
    n_b = len(group_b)
    x_a = sum(group_a)
    x_b = sum(group_b)
    
    p_a = x_a / n_a
    p_b = x_b / n_b
    p_pool = (x_a + x_b) / (n_a + n_b)
    
    # Z-statistic
    standard_error = np.sqrt(p_pool * (1 - p_pool) * (1/n_a + 1/n_b))
    z = (p_a - p_b) / standard_error
    
    # P-value (two-tailed)
    p_value = 2 * (1 - stats.norm.cdf(abs(z)))
    
    # Confidence interval for difference
    z_critical = stats.norm.ppf(1 - (1 - confidence_level) / 2)
    se_diff = np.sqrt((p_a * (1 - p_a) / n_a) + (p_b * (1 - p_b) / n_b))
    diff = p_a - p_b
    margin_of_error = z_critical * se_diff
    
    is_significant = p_value < alpha
    
    return StatisticalResult(
        data_type='binary',
        test_type='z-test',
        test_statistic=z,
        p_value=p_value,
        confidence_interval={
            'lower': diff - margin_of_error,
            'upper': diff + margin_of_error
        },
        effect_size=diff,  # Difference in proportions
        is_significant=is_significant,
        interpretation={
            'decision': 'reject' if is_significant else 'fail_to_reject',
            'plain_language': (
                f"There is a statistically significant difference in proportions between the groups (p = {p_value:.4f}). "
                f"Group A proportion ({p_a * 100:.1f}%) differs significantly from Group B proportion ({p_b * 100:.1f}%)."
            ) if is_significant else (
                f"There is no statistically significant difference in proportions between the groups (p = {p_value:.4f}). "
                f"The difference between Group A ({p_a * 100:.1f}%) and Group B ({p_b * 100:.1f}%) could be due to random variation."
            ),
            'recommendation': (
                'Reject the null hypothesis. The difference in proportions is statistically significant.'
            ) if is_significant else (
                'Fail to reject the null hypothesis. Consider increasing sample size or the effect may not be meaningful.'
            )
        },
        test_details={
            'null_hypothesis': 'There is no difference in proportions between Group A and Group B',
            'alternative_hypothesis': 'There is a difference in proportions between Group A and Group B',
            'assumptions': ['Binary outcomes (0/1)', 'Independent observations', 'Large sample size (np ≥ 5 and n(1-p) ≥ 5)'],
            'method': 'Two-Proportion Z-Test'
        }
    )


def chi_squared_test(group_a: List[float], group_b: List[float], 
                    alpha: float, confidence_level: float) -> StatisticalResult:
    """Perform chi-squared test for categorical data"""
    # Create contingency table
    unique_values = sorted(list(set(group_a + group_b)))
    contingency_table = []
    
    # Count frequencies
    for value in unique_values:
        count_a = group_a.count(value)
        count_b = group_b.count(value)
        contingency_table.append([count_a, count_b])
    
    contingency_array = np.array(contingency_table)
    
    # Calculate chi-squared statistic
    chi2, p_value, dof, expected = stats.chi2_contingency(contingency_array)
    
    # Effect size (Cramér's V)
    total_n = len(group_a) + len(group_b)
    effect_size = np.sqrt(chi2 / total_n)
    
    is_significant = p_value < alpha
    
    return StatisticalResult(
        data_type='categorical',
        test_type='chi-squared',
        test_statistic=chi2,
        p_value=p_value,
        confidence_interval={
            'lower': 0,
            'upper': effect_size * 2  # Rough estimate
        },
        effect_size=effect_size,
        is_significant=is_significant,
        interpretation={
            'decision': 'reject' if is_significant else 'fail_to_reject',
            'plain_language': (
                f"There is a statistically significant association between group membership and the categorical variable (p = {p_value:.4f}). "
                f"The distribution differs significantly between groups."
            ) if is_significant else (
                f"There is no statistically significant association between group membership and the categorical variable (p = {p_value:.4f}). "
                f"The distributions are similar between groups."
            ),
            'recommendation': (
                'Reject the null hypothesis. There is a significant association between variables.'
            ) if is_significant else (
                'Fail to reject the null hypothesis. No significant association detected.'
            )
        },
        test_details={
            'null_hypothesis': 'There is no association between group membership and the categorical variable',
            'alternative_hypothesis': 'There is an association between group membership and the categorical variable',
            'assumptions': ['Independent observations', 'Expected frequencies ≥ 5 in each cell', 'Categorical data'],
            'method': 'Chi-Squared Test of Independence'
        }
    )


def analyze_data(inputs: StatisticalInputs) -> StatisticalResult:
    """Main analysis function that detects data type and applies appropriate test"""
    group_a, group_b = inputs.group_a, inputs.group_b
    significance_level = inputs.significance_level
    confidence_level = inputs.confidence_level
    
    # Detect data type based on both groups
    data_type_a = detect_data_type(group_a)
    data_type_b = detect_data_type(group_b)
    
    # Use the more restrictive data type
    if data_type_a == 'binary' or data_type_b == 'binary':
        data_type = 'binary'
    elif data_type_a == 'categorical' or data_type_b == 'categorical':
        data_type = 'categorical'
    else:
        data_type = 'continuous'
    
    # Apply appropriate test
    if data_type == 'binary':
        return two_proportion_z_test(group_a, group_b, significance_level, confidence_level)
    elif data_type == 'categorical':
        return chi_squared_test(group_a, group_b, significance_level, confidence_level)
    else:  # continuous
        return welch_t_test(group_a, group_b, significance_level, confidence_level)


def convert_ab_test_data_to_analyzer_format(
    group_a_data: Dict[str, Any],
    group_b_data: Dict[str, Any]
) -> Dict[str, List[float]]:
    """Convert A/B test data to analyzer format"""
    # If continuous values are provided, use them directly
    if 'continuous_values' in group_a_data and 'continuous_values' in group_b_data:
        return {
            'group_a': group_a_data['continuous_values'],
            'group_b': group_b_data['continuous_values']
        }
    
    # Convert to binary arrays (0 = no conversion, 1 = conversion)
    group_a = ([1] * group_a_data['conversions'] + 
              [0] * (group_a_data['total_users'] - group_a_data['conversions']))
    group_b = ([1] * group_b_data['conversions'] + 
              [0] * (group_b_data['total_users'] - group_b_data['conversions']))
    
    return {'group_a': group_a, 'group_b': group_b}


def calculate_continuous_metrics(data: List[float]) -> Dict[str, float]:
    """Calculate continuous metrics for a dataset"""
    if not data:
        return {'mean': 0, 'standard_deviation': 0, 'min': 0, 'max': 0, 'median': 0, 'count': 0}
    
    sorted_data = sorted(data)
    mean_val = np.mean(data)
    std_dev = np.std(data, ddof=1)
    
    return {
        'mean': mean_val,
        'standard_deviation': std_dev,
        'min': sorted_data[0],
        'max': sorted_data[-1],
        'median': np.median(data),
        'count': len(data)
    }


def analyze_dynamic_ab_test(inputs: StatisticalInputs) -> Dict[str, Any]:
    """Enhanced analysis function that handles both conversion rates and continuous values"""
    base_result = analyze_data(inputs)
    
    # If data is continuous, also calculate continuous metrics
    if base_result.data_type == 'continuous':
        continuous_metrics = {
            'group_a': calculate_continuous_metrics(inputs.group_a),
            'group_b': calculate_continuous_metrics(inputs.group_b)
        }
        
        return {
            **base_result.__dict__,
            'continuous_metrics': continuous_metrics
        }
    
    return base_result.__dict__


def perform_dynamic_check(
    variants: List[Dict[str, Any]],
    params: Dict[str, float]
) -> Dict[str, Any]:
    """Dynamic check for conversion rates and continuous values post statistical test"""
    if len(variants) < 2:
        raise ValueError('Need at least 2 variants for comparison')
    
    control = variants[0]
    variant = variants[1]
    
    # Check if we have continuous values
    has_continuous_values = ('continuous_values' in control and 
                           'continuous_values' in variant)
    
    data = convert_ab_test_data_to_analyzer_format(
        {
            'conversions': control['conversions'],
            'total_users': control['visitors'],
            'continuous_values': control.get('continuous_values')
        },
        {
            'conversions': variant['conversions'],
            'total_users': variant['visitors'],
            'continuous_values': variant.get('continuous_values')
        }
    )
    
    inputs = StatisticalInputs(
        group_a=data['group_a'],
        group_b=data['group_b'],
        significance_level=params['significance_level'],
        power=params['power'],
        confidence_level=params['confidence_level']
    )
    
    return analyze_dynamic_ab_test(inputs)

# """