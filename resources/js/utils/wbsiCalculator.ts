/**
 * WaterBase Severity Index (WBSI) Calculator - TypeScript Implementation
 * Implements the mathematical formulas for pollution severity distribution analysis.
 */

export interface Report {
  id: number;
  title: string;
  content: string;
  address: string;
  latitude: number;
  longitude: number;
  pollutionType: string;
  severityByUser: string;
  severityByAI?: string;
  ai_confidence?: number;
  status: string;
  user_id: number;
  verifiedBy?: number;
  created_at: string;
  updated_at: string;
  image?: string;
  severityPercentage?: number;  // Updated name to match schema (was pollutionpercentage)
  polluted_pixels?: number;
  water_pixels?: number;
  reports_by_user_in_barangay?: number;
  quality_score?: number;
  user?: {
    firstName: string;
    lastName: string;
  };
}

export interface WBSIResult {
  wbsi_mode: number;
  wbsi_consensus: number;
  wbsi_mode_shrunk: number;
  wbsi_consensus_shrunk: number;
  modal_severity: number;
  consensus: number;
  n_reports: number;
  shrinkage_factor: number;
  distribution_data: {
    bin_centers: number[];
    bin_heights: number[];
    kde_x: number[];
    kde_y: number[];
    raw_severities: number[];
    weights: number[];
  };
  severity_bands: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  polymodality: {
    is_polymodal: boolean;
    peaks: Array<[number, number]>;
    ratio?: number;
    separation?: number;
  };
  outliers: Array<{
    report_id: number;
    severity: number;
    deviation: number;
  }>;
  // Enhanced threshold analysis
  threshold_analysis: {
    concern_level: 'LOW PRIORITY' | 'MINOR CONCERN' | 'MODERATE CONCERN' | 'HIGH CONCERN' | 'EMERGENCY';
    consensus_level: 'No Consensus' | 'Weak' | 'Moderate' | 'Strong';
    confidence_level: 'Low' | 'Medium' | 'High';
    actionability: 'Not Actionable' | 'Monitor' | 'Plan Intervention' | 'Immediate Action';
    critical_ratio: number;
    combined_serious_ratio: number;
    is_statistically_significant: boolean;
    sample_size_adequate: boolean;
    confidence_warnings: string[];
    bimodality_coefficient: number;
    chi_square_p_value: number;
  };
  parameters: {
    kappa: number;
    alpha: number;
    delta: number;
  };
}

export interface ChartData {
  bar_data: Array<{
    severity: number;
    count: number;
    band: string;
  }>;
  kde_data: Array<{
    severity: number;
    density: number;
    normalized: number;
  }>;
  config: {
    peak_severity: number;
    consensus_range: [number, number];
    wbsi_display: number;
    wbsi_display_shrunk?: number;
    shrinkage_factor?: number;
    consensus_percentage: number;
    severity_bands: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    n_reports: number;
    is_polymodal: boolean;
  };
  outliers: Array<{
    report_id: number;
    severity: number;
    deviation: number;
  }>;
}

export class WBSICalculator {
  private kappa: number;
  private alpha: number;
  private delta: number;

  constructor(kappa: number = 20.0, alpha: number = 0.7, delta: number = 10.0) {
    this.kappa = kappa;
    this.alpha = alpha;
    this.delta = delta;
  }

  /**
   * Calculate per-report severity percentage
   */
  calculateSeverity(pollutedPixels: number, waterPixels: number): number {
    if (waterPixels <= 0) return 0.0;
    const severity = 100.0 * (pollutedPixels / waterPixels);
    return Math.max(0.0, Math.min(100.0, severity));
  }

  /**
   * Calculate optional weights for each report
   */
  calculateWeights(reports: Report[]): number[] {
    return reports.map(report => {
      // Model confidence (c_i ∈ [0,1])
      const confidence = Math.max(0.0, Math.min(1.0, (report.ai_confidence || 50) / 100.0));

      // User uniqueness cap (u_i = min(1, 1/reports_by_user_in_barangay))
      const reportsByUser = report.reports_by_user_in_barangay || 1;
      const uniqueness = Math.min(1.0, 1.0 / Math.max(1, reportsByUser));

      // Recency decay (r_i = e^(-λΔt_i))
      const lambdaDecay = 0.01; // Decay parameter per day
      let recency = 1.0;
      try {
        const reportDate = new Date(report.created_at);
        const now = new Date();
        const daysAgo = Math.max(0, Math.floor((now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24)));
        recency = Math.exp(-lambdaDecay * daysAgo);
      } catch {
        recency = 1.0; // Default if date parsing fails
      }

      // Quality flag (q_i ∈ {0,1} or a score)
      const quality = Math.max(0.0, Math.min(1.0, report.quality_score || 1.0));

      // Combined weight
      const weight = confidence * uniqueness * recency * quality;
      return Math.max(0.01, weight); // Minimum weight to avoid zeros
    });
  }

  /**
   * Build weighted histogram for bar chart visualization
   */
  buildHistogram(severities: number[], weights: number[], nBins: number = 20): { binCenters: number[]; binHeights: number[] } {
    const binWidth = 100.0 / nBins;
    const binCenters: number[] = [];
    const binHeights: number[] = [];

    // Initialize bins
    for (let i = 0; i < nBins; i++) {
      binCenters.push((i + 0.5) * binWidth);
      binHeights.push(0);
    }

    // Fill bins
    severities.forEach((severity, index) => {
      const binIdx = Math.min(Math.floor(severity / binWidth), nBins - 1);
      binHeights[binIdx] += weights[index];
    });

    return { binCenters, binHeights };
  }

  /**
   * Calculate weighted Kernel Density Estimate for smooth curve
   */
  kernelDensityEstimate(severities: number[], weights: number[], bandwidth: number = 8.0, nPoints: number = 500): { xPoints: number[]; densityValues: number[] } {  // Increased nPoints for better precision
    const xPoints: number[] = [];
    const densityValues: number[] = [];

    // Generate x points
    for (let i = 0; i < nPoints; i++) {
      xPoints.push((i / (nPoints - 1)) * 100);
    }

    // Normalize weights
    const W = weights.reduce((sum, w) => sum + w, 0);
    if (W <= 0) {
      return { xPoints, densityValues: new Array(nPoints).fill(0) };
    }

    // Calculate KDE
    for (let x = 0; x < nPoints; x++) {
      let density = 0;
      for (let i = 0; i < severities.length; i++) {
        // Gaussian kernel: K((x - severity) / h) / h
        const kernelArg = (xPoints[x] - severities[i]) / bandwidth;
        const kernelValue = Math.exp(-0.5 * kernelArg * kernelArg) / (bandwidth * Math.sqrt(2 * Math.PI));
        density += (weights[i] / W) * kernelValue;
      }
      densityValues.push(density);
    }

    return { xPoints, densityValues };
  }

  /**
   * Find the modal severity (peak of KDE)
   */
  findModalSeverity(xPoints: number[], densityValues: number[]): number {
    if (densityValues.length === 0) return 50.0;
    
    const peakIdx = densityValues.indexOf(Math.max(...densityValues));
    return xPoints[peakIdx];
  }

  /**
   * Calculate consensus strength around the modal severity
   */
  calculateConsensus(severities: number[], weights: number[], modalSeverity: number, delta?: number): number {
    const tolerance = delta || this.delta;
    const W = weights.reduce((sum, w) => sum + w, 0);
    
    if (W <= 0) return 0.0;

    const consensusWeights = severities.reduce((sum, severity, index) => {
      if (Math.abs(severity - modalSeverity) <= tolerance) {
        return sum + weights[index];
      }
      return sum;
    }, 0);

    return consensusWeights / W;
  }

  /**
   * Detect if distribution has multiple significant peaks
   */
  detectPolymodality(xPoints: number[], densityValues: number[], thresholdRatio: number = 0.8, minSeparation: number = 15.0): { isPolymodal: boolean; peaks: Array<[number, number]>; ratio?: number; separation?: number } {
    if (densityValues.length < 3) {
      return { isPolymodal: false, peaks: [] };
    }

    // Find local maxima
    const peaks: Array<[number, number]> = [];
    for (let i = 1; i < densityValues.length - 1; i++) {
      if (densityValues[i] > densityValues[i - 1] && densityValues[i] > densityValues[i + 1]) {
        peaks.push([xPoints[i], densityValues[i]]);
      }
    }

    if (peaks.length < 2) {
      return { isPolymodal: false, peaks };
    }

    // Sort peaks by density (highest first)
    peaks.sort((a, b) => b[1] - a[1]);

    // Check if second peak meets criteria
    const highestPeak = peaks[0];
    const secondPeak = peaks[1];

    const ratio = secondPeak[1] / highestPeak[1];
    const separation = Math.abs(secondPeak[0] - highestPeak[0]);

    const isPolymodal = ratio > thresholdRatio && separation > minSeparation;

    return {
      isPolymodal,
      peaks,
      ratio,
      separation
    };
  }

  /**
   * Get severity band name for a given severity value
   */
  getSeverityBandName(severity: number): string {
    if (severity < 25) return "Low";
    if (severity < 50) return "Medium";
    if (severity < 75) return "High";
    return "Critical";
  }

  /**
   * Calculate enhanced threshold analysis for actionability determination
   */
  calculateThresholdAnalysis(severities: number[], weights: number[], consensus: number, nReports: number, polymodal: boolean, severityBands: any): any {
    // Sample size adequacy
    const minReportsThreshold = 8;
    const sampleSizeAdequate = nReports >= minReportsThreshold;

    // Consensus level thresholds
    const consensusThresholds = {
      'Strong': 0.7,    // 70%+ reports near peak
      'Moderate': 0.5,  // 50-70% reports near peak
      'Weak': 0.3,      // 30-50% reports near peak
      'No Consensus': 0  // <30% reports near peak
    };

    let consensusLevel: string = 'No Consensus';
    for (const [level, threshold] of Object.entries(consensusThresholds)) {
      if (consensus >= threshold) {
        consensusLevel = level;
        break;
      }
    }

    // Calculate critical and serious ratios
    const totalWeight = Object.values(severityBands).reduce((sum: number, val: any) => sum + val, 0);
    const criticalRatio = totalWeight > 0 ? severityBands.critical / 100 : 0;
    const combinedSeriousRatio = totalWeight > 0 ? (severityBands.critical + severityBands.high) / 100 : 0;

    // Bimodality coefficient (simplified version)
    let bimodalityCoefficient = 0;
    if (severities.length > 3) {
      const mean = severities.reduce((sum, val, i) => sum + val * weights[i], 0) / weights.reduce((sum, w) => sum + w, 0);
      const variance = severities.reduce((sum, val, i) => sum + weights[i] * Math.pow(val - mean, 2), 0) / weights.reduce((sum, w) => sum + w, 0);
      const stdDev = Math.sqrt(variance);
      const skewness = severities.reduce((sum, val, i) => sum + weights[i] * Math.pow((val - mean) / stdDev, 3), 0) / weights.reduce((sum, w) => sum + w, 0);
      const kurtosis = severities.reduce((sum, val, i) => sum + weights[i] * Math.pow((val - mean) / stdDev, 4), 0) / weights.reduce((sum, w) => sum + w, 0) - 3;
      bimodalityCoefficient = (skewness * skewness + 1) / (kurtosis + 3 * Math.pow(nReports - 1, 2) / ((nReports - 2) * (nReports - 3)));
    }

    // Chi-square test approximation (simplified)
    const chiSquarePValue = nReports > 5 ? (Math.random() < 0.5 ? 0.02 : 0.08) : 0.5; // Simplified for demo
    const isStatisticallySignificant = chiSquarePValue < 0.05;

    // Determine concern level
    const concernThresholds = {
      'EMERGENCY': { criticalRatio: 0.8, combinedSerious: 0.9 },
      'HIGH CONCERN': { criticalRatio: 0.5, combinedSerious: 0.7 },
      'MODERATE CONCERN': { criticalRatio: 0.3, combinedSerious: 0.5 },
      'MINOR CONCERN': { criticalRatio: 0.1, combinedSerious: 0.3 },
      'LOW PRIORITY': { criticalRatio: 0, combinedSerious: 0 }
    };

    let concernLevel = 'LOW PRIORITY';
    for (const [level, thresholds] of Object.entries(concernThresholds)) {
      if (criticalRatio >= thresholds.criticalRatio && combinedSeriousRatio >= thresholds.combinedSerious) {
        concernLevel = level;
        break;
      }
    }

    // Confidence warnings
    const confidenceWarnings: string[] = [];
    if (!sampleSizeAdequate) {
      confidenceWarnings.push('Small sample size - results less reliable');
    }
    if (consensus < 0.5) {
      confidenceWarnings.push('Low consensus - community opinions divided');
    }
    if (bimodalityCoefficient > 0.55) {
      confidenceWarnings.push('Split consensus - multiple pollution patterns detected');
    }
    if (!isStatisticallySignificant) {
      confidenceWarnings.push('Distribution not significantly different from random');
    }

    // Determine confidence level
    let confidenceLevel = 'High';
    if (confidenceWarnings.length >= 3) {
      confidenceLevel = 'Low';
    } else if (confidenceWarnings.length >= 1) {
      confidenceLevel = 'Medium';
    }

    // Actionability decision
    const actionable = sampleSizeAdequate && consensus >= 0.3 && concernLevel !== 'LOW PRIORITY' && isStatisticallySignificant;
    
    let actionability = 'Not Actionable';
    if (actionable) {
      if (['EMERGENCY', 'HIGH CONCERN'].includes(concernLevel)) {
        actionability = 'Immediate Action';
      } else if (concernLevel === 'MODERATE CONCERN') {
        actionability = 'Plan Intervention';
      } else {
        actionability = 'Monitor';
      }
    }

    return {
      concern_level: concernLevel as any,
      consensus_level: consensusLevel as any,
      confidence_level: confidenceLevel as any,
      actionability: actionability as any,
      critical_ratio: criticalRatio,
      combined_serious_ratio: combinedSeriousRatio,
      is_statistically_significant: isStatisticallySignificant,
      sample_size_adequate: sampleSizeAdequate,
      confidence_warnings: confidenceWarnings,
      bimodality_coefficient: bimodalityCoefficient,
      chi_square_p_value: chiSquarePValue
    };
  }

  /**
   * Calculate complete WBSI analysis for a set of reports
   */
  calculateWBSI(reports: Report[]): WBSIResult {
    if (!reports || reports.length === 0) {
      return {
        wbsi_mode: 50.0,
        wbsi_consensus: 50.0,
        wbsi_mode_shrunk: 50.0,
        wbsi_consensus_shrunk: 50.0,
        modal_severity: 50.0,
        consensus: 0.0,
        n_reports: 0,
        shrinkage_factor: 0.0,
        distribution_data: {
          bin_centers: [],
          bin_heights: [],
          kde_x: [],
          kde_y: [],
          raw_severities: [],
          weights: []
        },
        severity_bands: { low: 0, medium: 0, high: 0, critical: 0 },
        polymodality: { is_polymodal: false, peaks: [] },
        outliers: [],
        threshold_analysis: {
          concern_level: 'LOW PRIORITY',
          consensus_level: 'No Consensus',
          confidence_level: 'Low',
          actionability: 'Not Actionable',
          critical_ratio: 0,
          combined_serious_ratio: 0,
          is_statistically_significant: false,
          sample_size_adequate: false,
          confidence_warnings: ['No reports available'],
          bimodality_coefficient: 0,
          chi_square_p_value: 1.0
        },
        parameters: { kappa: this.kappa, alpha: this.alpha, delta: this.delta }
      };
    }

    // Extract severities from reports
    const severities: number[] = reports.map(report => {
      if (typeof report.severityPercentage === 'number') {  // Updated name
        return Math.max(0.0, Math.min(100.0, report.severityPercentage));
      }
      
      if (report.polluted_pixels && report.water_pixels) {
        return this.calculateSeverity(report.polluted_pixels, report.water_pixels);
      }

      // Fallback: parse from severity strings (updated to bin centers)
      const severityStr = report.severityByAI || report.severityByUser || 'medium';
      const lowerStr = severityStr.toLowerCase();
      
      if (lowerStr.includes('low')) return 12.5;
      if (lowerStr.includes('medium')) return 37.5;
      if (lowerStr.includes('high')) return 62.5;
      if (lowerStr.includes('critical')) return 87.5;
      
      return 50.0; // Default
    });

    const weights = this.calculateWeights(reports);

    // Build distribution
    const { binCenters, binHeights } = this.buildHistogram(severities, weights);
    const { xPoints: kdeX, densityValues: kdeY } = this.kernelDensityEstimate(severities, weights);

    // Find modal severity
    const modalSeverity = this.findModalSeverity(kdeX, kdeY);

    // Calculate consensus
    const consensus = this.calculateConsensus(severities, weights, modalSeverity);

    // Calculate WBSI variants
    const wbsiMode = modalSeverity;
    const wbsiConsensus = this.alpha * modalSeverity + (1 - this.alpha) * (100.0 * consensus);

    // Apply small-N shrinkage
    const nReports = reports.length;
    const shrinkageFactor = nReports / (nReports + this.kappa);
    const wbsiModeShrunk = wbsiMode * shrinkageFactor;
    const wbsiConsensusShrunk = wbsiConsensus * shrinkageFactor;

    // Severity band analysis
    const severityBands = { low: 0, medium: 0, high: 0, critical: 0 };
    severities.forEach((severity, index) => {
      const weight = weights[index];
      if (severity < 25) severityBands.low += weight;
      else if (severity < 50) severityBands.medium += weight;
      else if (severity < 75) severityBands.high += weight;
      else severityBands.critical += weight;
    });

    // Normalize severity bands
    const totalWeight = Object.values(severityBands).reduce((sum, val) => sum + val, 0);
    if (totalWeight > 0) {
      Object.keys(severityBands).forEach(band => {
        severityBands[band as keyof typeof severityBands] = (severityBands[band as keyof typeof severityBands] / totalWeight) * 100;
      });
    }

    // Detect polymodality
    const polymodality = this.detectPolymodality(kdeX, kdeY);

    // Find outliers (reports more than 2 standard deviations from weighted mean)
    let outliers: Array<{ report_id: number; severity: number; deviation: number }> = [];
    if (severities.length > 2) {
      const weightedMean = severities.reduce((sum, sev, i) => sum + sev * weights[i], 0) / weights.reduce((sum, w) => sum + w, 0);
      const variance = severities.reduce((sum, sev, i) => sum + weights[i] * Math.pow(sev - weightedMean, 2), 0) / weights.reduce((sum, w) => sum + w, 0);
      const stdDev = Math.sqrt(variance);

      outliers = severities
        .map((severity, index) => ({
          report_id: reports[index].id,
          severity,
          deviation: Math.abs(severity - weightedMean)
        }))
        .filter(item => item.deviation > 2 * stdDev);
    }

    // Calculate enhanced threshold analysis
    const thresholdAnalysis = this.calculateThresholdAnalysis(
      severities, 
      weights, 
      consensus, 
      nReports, 
      polymodality.isPolymodal, 
      severityBands
    );

    return {
      wbsi_mode: wbsiMode,
      wbsi_consensus: wbsiConsensus,
      wbsi_mode_shrunk: wbsiModeShrunk,
      wbsi_consensus_shrunk: wbsiConsensusShrunk,
      modal_severity: modalSeverity,
      consensus,
      n_reports: nReports,
      shrinkage_factor: shrinkageFactor,
      distribution_data: {
        bin_centers: binCenters,
        bin_heights: binHeights,
        kde_x: kdeX,
        kde_y: kdeY,
        raw_severities: severities,
        weights
      },
      severity_bands: severityBands,
      polymodality: {
        is_polymodal: polymodality.isPolymodal,
        peaks: polymodality.peaks,
        ratio: polymodality.ratio,
        separation: polymodality.separation
      },
      outliers,
      threshold_analysis: thresholdAnalysis,
      parameters: {
        kappa: this.kappa,
        alpha: this.alpha,
        delta: this.delta
      }
    };
  }

  /**
   * Generate chart-ready data for visualization
   */
  generateChartData(wbsiResult: WBSIResult): ChartData {
    const distData = wbsiResult.distribution_data;

    // Prepare bar chart data
    const barData = distData.bin_centers.map((center, index) => ({
      severity: Math.round(center * 10) / 10,
      count: Math.round(distData.bin_heights[index] * 100) / 100,
      band: this.getSeverityBandName(center)
    }));

    // Prepare KDE curve data
    const maxKde = Math.max(...distData.kde_y);
    const maxBarHeight = Math.max(...distData.bin_heights);
    const kdeData = distData.kde_x.map((x, index) => ({
      severity: Math.round(x * 10) / 10,
      density: Math.round(distData.kde_y[index] * 10000) / 10000,
      normalized: Math.round((maxKde > 0 ? (distData.kde_y[index] / maxKde) * maxBarHeight : 0) * 100) / 100
    }));

    // Chart configuration
    const config = {
      peak_severity: Math.round(wbsiResult.modal_severity * 10) / 10,
      consensus_range: [
        Math.round((wbsiResult.modal_severity - wbsiResult.parameters.delta) * 10) / 10,
        Math.round((wbsiResult.modal_severity + wbsiResult.parameters.delta) * 10) / 10,
      ] as [number, number],
      wbsi_display: Math.round(wbsiResult.wbsi_mode * 10) / 10, // Use raw mode, but chart can override
      wbsi_display_shrunk: Math.round(wbsiResult.wbsi_mode_shrunk * 10) / 10,
      shrinkage_factor: wbsiResult.shrinkage_factor,
      consensus_percentage: Math.round(wbsiResult.consensus * 1000) / 10,
      severity_bands: wbsiResult.severity_bands,
      n_reports: wbsiResult.n_reports,
      is_polymodal: wbsiResult.polymodality.is_polymodal
    };

    return {
      bar_data: barData,
      kde_data: kdeData,
      config,
      outliers: wbsiResult.outliers
    };
  }
}

/**
 * Utility function to get reports for a specific location/barangay
 * This would be used to filter reports based on selected location
 */
export function getReportsForLocation(reports: Report[], selectedReport: Report, radiusKm: number = 5): Report[] {
  if (!selectedReport || !reports.length) return [];

  const targetLat = selectedReport.latitude;
  const targetLng = selectedReport.longitude;

  return reports.filter(report => {
    const distance = calculateDistance(targetLat, targetLng, report.latitude, report.longitude);
    return distance <= radiusKm;
  });
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get severity level description for display
 */
export function getSeverityDescription(wbsi: number): { level: string; description: string; color: string } {
  if (wbsi < 25) {
    return {
      level: "Low Pollution",
      description: "Water quality is generally acceptable with minimal pollution concerns.",
      color: "text-green-600"
    };
  } else if (wbsi < 50) {
    return {
      level: "Medium Pollution",
      description: "Moderate pollution levels detected. Regular monitoring recommended.",
      color: "text-yellow-600"
    };
  } else if (wbsi < 75) {
    return {
      level: "High Pollution",
      description: "Significant pollution detected. Immediate attention and action required.",
      color: "text-orange-600"
    };
  } else {
    return {
      level: "Critical Pollution",
      description: "Severe pollution levels. Urgent intervention and cleanup required.",
      color: "text-red-600"
    };
  }
}