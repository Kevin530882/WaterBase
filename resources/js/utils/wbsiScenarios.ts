/**
 * WBSI Scenario Guide - Comprehensive explanations and examples
 * Helps users understand different pollution patterns and their implications
 */

export interface ScenarioExample {
  id: string;
  title: string;
  description: string;
  wbsiRange: [number, number];
  consensus: [number, number];
  pattern: string;
  interpretation: string;
  actionRecommendation: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  exampleData: number[];
  realWorldExample: string;
}

export const WBSI_SCENARIOS: ScenarioExample[] = [
  {
    id: 'clean-consensus',
    title: 'Clean Water - Strong Agreement',
    description: 'Community consistently reports very low pollution levels across all reports.',
    wbsiRange: [0, 25],
    consensus: [80, 100],
    pattern: 'Tight cluster at low severity',
    interpretation: 'Water body is in excellent condition with strong community consensus. The low WBSI score and high consensus indicate reliable assessment.',
    actionRecommendation: 'Continue regular monitoring. Maintain current conservation practices. Use as a model for other areas.',
    urgency: 'low',
    exampleData: [5, 8, 10, 12, 15],
    realWorldExample: 'Protected watershed areas, well-maintained municipal water sources'
  },
  {
    id: 'clean-mixed',
    title: 'Generally Clean - Some Disagreement',
    description: 'Mostly low pollution reports but with some variation in community assessment.',
    wbsiRange: [0, 25],
    consensus: [50, 80],
    pattern: 'Scattered low severity reports',
    interpretation: 'Water quality is generally good but there may be localized issues or seasonal variations that some community members notice.',
    actionRecommendation: 'Investigate areas of disagreement. Conduct seasonal monitoring. Provide community education on water quality indicators.',
    urgency: 'low',
    exampleData: [2, 15, 20, 25, 35],
    realWorldExample: 'Recreational lakes with seasonal algae blooms, streams near agricultural areas'
  },
  {
    id: 'moderate-consensus',
    title: 'Moderate Pollution - Clear Agreement',
    description: 'Community consistently identifies moderate pollution levels requiring attention.',
    wbsiRange: [25, 50],
    consensus: [70, 100],
    pattern: 'Concentrated around medium severity',
    interpretation: 'Established pollution problem that needs systematic intervention. High consensus indicates reliable community assessment.',
    actionRecommendation: 'Develop comprehensive cleanup plan. Identify pollution sources. Implement monitoring program. Engage stakeholders.',
    urgency: 'medium',
    exampleData: [30, 35, 40, 42, 45],
    realWorldExample: 'Urban streams with stormwater runoff, rivers near light industrial areas'
  },
  {
    id: 'moderate-split',
    title: 'Moderate Pollution - Split Opinions',
    description: 'Community divided on pollution severity, suggesting complex or variable conditions.',
    wbsiRange: [25, 50],
    consensus: [30, 70],
    pattern: 'Multiple peaks or wide spread',
    interpretation: 'Pollution levels may vary significantly by location, time, or measurement method. Indicates need for more detailed assessment.',
    actionRecommendation: 'Conduct detailed site investigation. Use multiple assessment methods. Engage diverse community voices. Consider temporal variations.',
    urgency: 'medium',
    exampleData: [20, 25, 45, 50, 65],
    realWorldExample: 'Rivers with point source pollution, areas with intermittent contamination'
  },
  {
    id: 'high-consensus',
    title: 'High Pollution - Strong Agreement',
    description: 'Community strongly agrees on significant pollution requiring immediate action.',
    wbsiRange: [50, 75],
    consensus: [75, 100],
    pattern: 'Tight cluster at high severity',
    interpretation: 'Serious pollution problem with clear community recognition. High reliability of assessment demands urgent response.',
    actionRecommendation: 'Implement immediate intervention measures. Identify and address pollution sources. Consider emergency protocols. Engage authorities.',
    urgency: 'high',
    exampleData: [60, 65, 68, 70, 75],
    realWorldExample: 'Industrial discharge sites, heavily polluted urban waterways'
  },
  {
    id: 'high-variable',
    title: 'High Pollution - Variable Assessment',
    description: 'Generally high pollution but with significant variation in community reports.',
    wbsiRange: [50, 75],
    consensus: [40, 75],
    pattern: 'Wide distribution around high severity',
    interpretation: 'Severe pollution with complex patterns. Variation suggests multiple sources, seasonal effects, or measurement challenges.',
    actionRecommendation: 'Comprehensive technical assessment needed. Address multiple pollution sources. Coordinate with regulatory agencies. Public health evaluation.',
    urgency: 'high',
    exampleData: [40, 55, 70, 80, 85],
    realWorldExample: 'Mining-affected waterways, agricultural runoff areas with seasonal variation'
  },
  {
    id: 'critical-consensus',
    title: 'Critical Pollution - Emergency Level',
    description: 'Community unanimously reports extremely severe pollution requiring emergency response.',
    wbsiRange: [75, 100],
    consensus: [80, 100],
    pattern: 'Concentrated at critical severity',
    interpretation: 'Environmental emergency requiring immediate action. Strong consensus indicates reliable and urgent assessment.',
    actionRecommendation: 'Emergency response protocol. Immediate health advisories. Contact environmental authorities. Implement containment measures.',
    urgency: 'critical',
    exampleData: [80, 85, 88, 90, 95],
    realWorldExample: 'Chemical spills, sewage overflows, toxic algae blooms'
  },
  {
    id: 'bimodal-conflict',
    title: 'Conflicting Assessments - Two Peaks',
    description: 'Community split between two distinct pollution level assessments.',
    wbsiRange: [20, 80],
    consensus: [20, 50],
    pattern: 'Two distinct peaks',
    interpretation: 'Significant disagreement suggests either spatial variation, temporal changes, or methodological differences in assessment.',
    actionRecommendation: 'Detailed investigation required. Separate analysis by location/time. Stakeholder workshops. Technical verification needed.',
    urgency: 'medium',
    exampleData: [15, 20, 25, 70, 80],
    realWorldExample: 'Areas with both pristine and polluted sections, seasonal contamination events'
  },
  {
    id: 'outlier-pattern',
    title: 'Consensus with Outliers',
    description: 'Strong agreement on pollution level but with a few significantly different reports.',
    wbsiRange: [30, 60],
    consensus: [60, 80],
    pattern: 'Main cluster with isolated outliers',
    interpretation: 'Generally reliable assessment with some reports requiring investigation. Outliers may indicate special conditions or measurement errors.',
    actionRecommendation: 'Proceed with main consensus while investigating outlier reports. Verify unusual findings. Consider localized effects.',
    urgency: 'medium',
    exampleData: [5, 45, 50, 55, 95],
    realWorldExample: 'Generally polluted areas with isolated clean springs or heavily contaminated spots'
  },
  {
    id: 'insufficient-data',
    title: 'Limited Reports - Uncertain Assessment',
    description: 'Few reports available, making assessment reliability questionable.',
    wbsiRange: [0, 100],
    consensus: [0, 100],
    pattern: 'Sparse data points',
    interpretation: 'Insufficient data for reliable assessment. WBSI shrinkage factor reduces confidence in results.',
    actionRecommendation: 'Encourage more community reporting. Conduct targeted data collection. Use results cautiously until more data available.',
    urgency: 'low',
    exampleData: [30, 60],
    realWorldExample: 'Remote areas, newly monitored locations, areas with low community engagement'
  }
];

export interface WBSIInterpretation {
  score: number;
  level: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  actionPriority: string;
  timeframe: string;
}

export function getWBSIInterpretation(wbsi: number, consensus: number, nReports: number): WBSIInterpretation {
  const baseInterpretation = getBaseInterpretation(wbsi);
  
  // Adjust interpretation based on consensus and sample size
  const adjustedDescription = adjustForReliability(baseInterpretation.description, consensus, nReports);
  const adjustedPriority = adjustPriorityForReliability(baseInterpretation.actionPriority, consensus, nReports);
  
  return {
    ...baseInterpretation,
    description: adjustedDescription,
    actionPriority: adjustedPriority
  };
}

function getBaseInterpretation(wbsi: number): WBSIInterpretation {
  if (wbsi < 25) {
    return {
      score: wbsi,
      level: "Clean Water",
      description: "Water quality is excellent with minimal pollution concerns. Safe for most uses and supports healthy aquatic ecosystems.",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      actionPriority: "Low - Maintain current conditions",
      timeframe: "Routine monitoring"
    };
  } else if (wbsi < 50) {
    return {
      score: wbsi,
      level: "Moderate Pollution",
      description: "Noticeable pollution present. Water quality is declining and requires attention to prevent further degradation.",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      actionPriority: "Medium - Plan intervention",
      timeframe: "Within 3-6 months"
    };
  } else if (wbsi < 75) {
    return {
      score: wbsi,
      level: "High Pollution",
      description: "Significant pollution levels detected. Water quality is poor and poses risks to health and environment.",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      actionPriority: "High - Immediate action required",
      timeframe: "Within 1-3 months"
    };
  } else {
    return {
      score: wbsi,
      level: "Critical Pollution",
      description: "Severe pollution levels present. Water poses serious health and environmental risks requiring emergency response.",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      actionPriority: "Critical - Emergency response",
      timeframe: "Immediate action required"
    };
  }
}

function adjustForReliability(baseDescription: string, consensus: number, nReports: number): string {
  let reliability = "";
  
  if (nReports < 3) {
    reliability = " ⚠️ Limited data - assessment reliability is low. More reports needed for confident evaluation.";
  } else if (consensus < 40) {
    reliability = " ⚠️ Low community consensus - results should be interpreted cautiously. Significant disagreement exists among reporters.";
  } else if (consensus < 60) {
    reliability = " ℹ️ Moderate consensus - generally reliable assessment with some variation in community opinions.";
  } else if (consensus >= 80) {
    reliability = " ✅ Strong community consensus - high confidence in assessment reliability.";
  } else {
    reliability = " ✅ Good consensus - reliable assessment with broad community agreement.";
  }
  
  return baseDescription + reliability;
}

function adjustPriorityForReliability(basePriority: string, consensus: number, nReports: number): string {
  if (nReports < 3) {
    return basePriority + " (Verify with additional reports)";
  } else if (consensus < 40) {
    return basePriority + " (Investigate disagreement first)";
  }
  return basePriority;
}

export function findMatchingScenarios(wbsi: number, consensus: number): ScenarioExample[] {
  return WBSI_SCENARIOS.filter(scenario => {
    const wbsiMatch = wbsi >= scenario.wbsiRange[0] && wbsi <= scenario.wbsiRange[1];
    const consensusMatch = consensus >= scenario.consensus[0]/100 && consensus <= scenario.consensus[1]/100;
    return wbsiMatch && consensusMatch;
  }).slice(0, 3); // Return top 3 matches
}

export function getScenarioInsights(wbsi: number, consensus: number, nReports: number, outliers: number): string[] {
  const insights: string[] = [];
  
  // Sample size insights
  if (nReports < 3) {
    insights.push("📊 Very small sample size - results may not be representative of actual conditions");
  } else if (nReports < 5) {
    insights.push("📊 Small sample size - consider gathering more reports for better reliability");
  } else if (nReports > 20) {
    insights.push("📊 Large sample size - high statistical confidence in results");
  }
  
  // Consensus insights
  if (consensus > 0.8) {
    insights.push("🎯 Strong community agreement - indicates clear and consistent pollution conditions");
  } else if (consensus < 0.4) {
    insights.push("⚠️ Significant disagreement - may indicate variable conditions or measurement issues");
  } else if (consensus < 0.6) {
    insights.push("📈 Moderate agreement - some variation in community assessment exists");
  }
  
  // Outlier insights
  if (outliers > 0) {
    if (outliers === 1) {
      insights.push("🔍 One outlier detected - investigate this unusual report for special conditions");
    } else {
      insights.push(`🔍 ${outliers} outliers detected - investigate these unusual reports for special conditions`);
    }
  }
  
  // WBSI-specific insights
  if (wbsi < 10 && consensus > 0.7) {
    insights.push("🌊 Excellent water quality with strong consensus - ideal conditions for protection");
  } else if (wbsi > 80 && consensus > 0.7) {
    insights.push("🚨 Critical pollution with strong agreement - emergency response justified");
  } else if (wbsi > 50 && consensus < 0.5) {
    insights.push("❓ High pollution but low consensus - detailed investigation needed before action");
  }
  
  return insights;
}

export const CHART_INTERPRETATION_GUIDE = {
  barChart: {
    title: "Report Distribution Bars",
    description: "Shows how many reports fall into each severity range. Taller bars indicate more reports at that pollution level.",
    interpretation: [
      "Single tall bar = Strong community agreement on pollution level",
      "Multiple bars = Varied opinions or conditions across the area", 
      "Scattered bars = Mixed or uncertain pollution conditions"
    ]
  },
  kdeCurve: {
    title: "Trend Line (KDE Curve)",
    description: "Smooth curve showing the overall pattern of pollution severity reports. The peak shows where most reports cluster.",
    interpretation: [
      "Sharp peak = Strong consensus on specific pollution level",
      "Flat curve = Wide variation in reported pollution levels",
      "Multiple peaks = Community divided between different assessments"
    ]
  },
  peakLine: {
    title: "Peak Severity (Dashed Line)",
    description: "Vertical line showing the most commonly reported pollution level. This is your WBSI modal severity.",
    interpretation: [
      "Position shows community's primary assessment",
      "Left side (low %) = Generally clean conditions",
      "Right side (high %) = Generally polluted conditions"
    ]
  },
  consensusArea: {
    title: "Consensus Zone (Shaded Area)", 
    description: "Highlighted area showing the range around the peak where most community reports fall (±10% by default).",
    interpretation: [
      "More reports in shaded area = Higher consensus percentage",
      "Wide shaded area = Community generally agrees within broader range",
      "Reports outside area = Outliers or special conditions"
    ]
  }
};

export function generateSummaryReport(wbsi: number, consensus: number, nReports: number, outliers: number, isPolymodal: boolean): {
  overall: string;
  reliability: string;
  recommendation: string;
  nextSteps: string[];
} {
  const interpretation = getWBSIInterpretation(wbsi, consensus, nReports);
  const matchingScenarios = findMatchingScenarios(wbsi, consensus);
  
  return {
    overall: `Water pollution severity assessed at ${wbsi.toFixed(1)}% (${interpretation.level}). ${interpretation.description}`,
    
    reliability: `Assessment reliability is ${getReliabilityLevel(consensus, nReports)} based on ${nReports} community reports with ${(consensus * 100).toFixed(1)}% consensus.`,
    
    recommendation: `${interpretation.actionPriority} - ${interpretation.timeframe}. ${matchingScenarios[0]?.actionRecommendation || 'Follow standard protocols for this pollution level.'}`,
    
    nextSteps: generateNextSteps(wbsi, consensus, nReports, outliers, isPolymodal)
  };
}

function getReliabilityLevel(consensus: number, nReports: number): string {
  if (nReports < 3) return "LOW due to insufficient reports";
  if (consensus < 0.4) return "LOW due to poor consensus";
  if (consensus < 0.6) return "MODERATE with some uncertainty";
  if (consensus >= 0.8) return "HIGH with strong agreement";
  return "GOOD with reasonable consensus";
}

function generateNextSteps(wbsi: number, consensus: number, nReports: number, outliers: number, isPolymodal: boolean): string[] {
  const steps: string[] = [];
  
  // Data quality steps
  if (nReports < 5) {
    steps.push("Collect additional community reports to improve assessment reliability");
  }
  
  if (outliers > 0) {
    steps.push(`Investigate ${outliers} outlier report${outliers > 1 ? 's' : ''} for special conditions or measurement errors`);
  }
  
  if (isPolymodal) {
    steps.push("Analyze split consensus - investigate why community opinions are divided");
  }
  
  // Action steps based on WBSI level
  if (wbsi >= 75) {
    steps.push("Contact environmental authorities for emergency response evaluation");
    steps.push("Issue public health advisories if water is used for drinking/recreation");
    steps.push("Implement immediate containment measures if pollution source is active");
  } else if (wbsi >= 50) {
    steps.push("Conduct detailed pollution source investigation");
    steps.push("Develop comprehensive cleanup and remediation plan");
    steps.push("Engage relevant stakeholders and authorities");
  } else if (wbsi >= 25) {
    steps.push("Monitor trends over time to detect changes");
    steps.push("Identify and address potential pollution sources");
    steps.push("Implement preventive measures to avoid deterioration");
  } else {
    steps.push("Maintain current water protection measures");
    steps.push("Continue regular community monitoring");
    steps.push("Use as model for protecting other water bodies");
  }
  
  // Consensus improvement steps
  if (consensus < 0.5) {
    steps.push("Conduct stakeholder workshops to understand disagreement");
    steps.push("Provide community training on water quality assessment");
  }
  
  return steps;
}
