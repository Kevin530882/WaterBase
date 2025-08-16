import React, { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Target, 
  TrendingUp, 
  Users, 
  Info, 
  BarChart3, 
  FileText, 
  Lightbulb,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartData } from '@/utils/wbsiCalculator';
import { 
  getWBSIInterpretation, 
  findMatchingScenarios, 
  getScenarioInsights, 
  generateSummaryReport,
  CHART_INTERPRETATION_GUIDE,
  WBSI_SCENARIOS
} from '@/utils/wbsiScenarios';

interface SeverityDistributionChartProps {
  chartData: ChartData;
  className?: string;
  locationName?: string;
}

export const SeverityDistributionChart: React.FC<SeverityDistributionChartProps> = ({
  chartData,
  className,
  locationName
}) => {
  const { bar_data, kde_data, config, outliers } = chartData;
  const [activeTab, setActiveTab] = useState("overview");
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get comprehensive analysis
  const interpretation = getWBSIInterpretation(config.wbsi_display, config.consensus_percentage / 100, config.n_reports);
  const matchingScenarios = findMatchingScenarios(config.wbsi_display, config.consensus_percentage / 100);
  const insights = getScenarioInsights(config.wbsi_display, config.consensus_percentage / 100, config.n_reports, outliers.length);
  const summaryReport = generateSummaryReport(config.wbsi_display, config.consensus_percentage / 100, config.n_reports, outliers.length, config.is_polymodal);

  // Prepare combined data for the chart
  const combinedData = bar_data.map(barItem => {
    const kdeItem = kde_data.find(kde => Math.abs(kde.severity - barItem.severity) < 0.5);
    return {
      ...barItem,
      kde: kdeItem?.normalized || 0,
      density: kdeItem?.density || 0
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{`Severity: ${label}%`}</p>
          <p className="text-blue-600">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
            {`Reports: ${data.count.toFixed(1)}`}
          </p>
          <p className="text-green-600">
            <span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>
            {`Distribution: ${(data.density * 100).toFixed(2)}%`}
          </p>
          <p className="text-xs text-gray-500 mt-1">Band: {data.band}</p>
        </div>
      );
    }
    return null;
  };

  // Get severity band color
  const getSeverityBandColor = (band: string): string => {
    switch (band.toLowerCase()) {
      case 'low':
        return '#10b981'; // green-500
      case 'medium':
        return '#f59e0b'; // yellow-500
      case 'high':
        return '#f97316'; // orange-500
      case 'critical':
        return '#ef4444'; // red-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  // Custom bar shape with severity-based coloring
  const CustomBar = (props: any) => {
    const { fill, payload, ...rest } = props;
    const color = getSeverityBandColor(payload.band);
    return <Bar {...rest} fill={color} />;
  };

  const severityDescription = React.useMemo(() => {
    const wbsi = config.wbsi_display;
    if (wbsi < 25) {
      return {
        level: "Low Pollution",
        description: "Water quality is generally acceptable with minimal pollution concerns.",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200"
      };
    } else if (wbsi < 50) {
      return {
        level: "Medium Pollution",
        description: "Moderate pollution levels detected. Regular monitoring recommended.",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200"
      };
    } else if (wbsi < 75) {
      return {
        level: "High Pollution",
        description: "Significant pollution detected. Immediate attention and action required.",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200"
      };
    } else {
      return {
        level: "Critical Pollution",
        description: "Severe pollution levels. Urgent intervention and cleanup required.",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200"
      };
    }
  }, [config.wbsi_display]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-waterbase-950 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Pollution Analysis
            {locationName && <span className="text-xs text-gray-500 ml-2">({locationName})</span>}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        
        {/* Quick WBSI Score - Always visible */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={cn("text-xs", severityDescription.color)}
            >
              WBSI: {config.wbsi_display}%
            </Badge>
            <span className="text-xs text-gray-600">
              {config.n_reports} reports, {config.consensus_percentage}% consensus
            </span>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-8">
              <TabsTrigger value="overview" className="text-xs px-1">
                <Eye className="w-3 h-3 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="distribution" className="text-xs px-1">
                <BarChart3 className="w-3 h-3 mr-1" />
                Chart
              </TabsTrigger>
              <TabsTrigger value="summary" className="text-xs px-1">
                <FileText className="w-3 h-3 mr-1" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs px-1">
                <Lightbulb className="w-3 h-3 mr-1" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="debug" className="text-xs px-1">
                <HelpCircle className="w-3 h-3 mr-1" />
                Debug
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4 max-h-96 overflow-y-auto">
              <TabsContent value="overview" className="space-y-4 mt-0">
                {/* WBSI Score Display */}
                <div className={cn(
                  "p-3 rounded-lg border",
                  interpretation.bgColor,
                  interpretation.borderColor
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Target className="w-4 h-4 mr-2 text-waterbase-600" />
                      <span className="font-semibold text-sm">{interpretation.level}</span>
                    </div>
                    <Badge variant="outline" className={interpretation.color}>
                      {config.wbsi_display}%
                    </Badge>
                  </div>
                  
                  <div className="text-xs space-y-2">
                    <p className="text-gray-700">
                      {summaryReport.overall}
                    </p>
                    <p className="text-gray-600">
                      {summaryReport.reliability}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Peak Severity:</span>
                    <span className="font-medium">{config.peak_severity}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Community Agreement:</span>
                    <span className="font-medium">{config.consensus_percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Reports:</span>
                    <span className="font-medium">{config.n_reports}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Unusual Reports:</span>
                    <span className="font-medium">{outliers.length}</span>
                  </div>
                </div>

                {/* Action Priority */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-1">
                    <AlertTriangle className="w-4 h-4 mr-2 text-blue-600" />
                    <span className="font-semibold text-sm text-blue-800">Action Required</span>
                  </div>
                  <p className="text-xs text-blue-700">{summaryReport.recommendation}</p>
                </div>

                {/* Warnings */}
                {config.is_polymodal && (
                  <div className="flex items-start p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <AlertTriangle className="w-3 h-3 mr-2 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-800">Split Community Opinion</p>
                      <p className="text-yellow-700 mt-1">
                        Multiple severity peaks detected. Investigation needed to understand disagreement.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="distribution" className="space-y-4 mt-0">
                {/* Chart */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={combinedData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="severity"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                        label={{ value: 'Pollution Severity (%)', position: 'insideBottom', offset: -5, style: { fontSize: '10px' } }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        width={35}
                        label={{ value: 'Reports', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      
                      {/* Consensus range area */}
                      <ReferenceArea
                        x1={Math.max(0, config.consensus_range[0])}
                        x2={Math.min(100, config.consensus_range[1])}
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        label="Consensus Zone"
                      />
                      
                      {/* Peak severity line */}
                      <ReferenceLine
                        x={config.peak_severity}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        label={{ value: 'Peak', position: 'top' }}
                      />
                      
                      {/* Bars for report counts */}
                      <Bar
                        dataKey="count"
                        fill={(entry: any) => getSeverityBandColor(entry.band)}
                        fillOpacity={0.8}
                        radius={[2, 2, 0, 0]}
                      />
                      
                      {/* KDE curve */}
                      <Line
                        type="monotone"
                        dataKey="kde"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart Interpretation */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-800">How to Read This Chart</h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-blue-600">Blue bars:</span>
                      <span className="text-gray-600 ml-1">Number of reports at each pollution level</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-600">Green line:</span>
                      <span className="text-gray-600 ml-1">Overall trend showing pollution pattern</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-600">Dashed line:</span>
                      <span className="text-gray-600 ml-1">Peak severity - most commonly reported level</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-600">Shaded area:</span>
                      <span className="text-gray-600 ml-1">Consensus zone where most reports agree</span>
                    </div>
                  </div>
                </div>

                {/* Severity Bands */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Pollution Level Breakdown</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(config.severity_bands).map(([band, percentage]) => (
                      <div key={band} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: getSeverityBandColor(band) }}
                          />
                          <span className="capitalize text-gray-700 font-medium">{band}</span>
                        </div>
                        <span className="font-semibold">{percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="summary" className="space-y-4 mt-0">
                {/* Executive Summary */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Executive Summary
                  </h4>
                  
                  <div className={cn(
                    "p-3 rounded-lg border",
                    interpretation.bgColor,
                    interpretation.borderColor
                  )}>
                    <div className="space-y-2 text-xs">
                      <p className="font-medium">{summaryReport.overall}</p>
                      <p>{summaryReport.reliability}</p>
                      <p className="font-medium mt-2">{summaryReport.recommendation}</p>
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800">Recommended Next Steps</h4>
                  <div className="space-y-2">
                    {summaryReport.nextSteps.map((step, index) => (
                      <div key={index} className="flex items-start text-xs">
                        <span className="text-waterbase-600 font-bold mr-2 mt-0.5">{index + 1}.</span>
                        <span className="text-gray-700">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Insights */}
                {insights.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800">Key Insights</h4>
                    <div className="space-y-2">
                      {insights.map((insight, index) => (
                        <div key={index} className="flex items-start text-xs p-2 bg-blue-50 rounded">
                          <span className="text-gray-700">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-4 mt-0">
                {/* Chart Guide */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Understanding Your Results
                  </h4>
                  
                  {Object.entries(CHART_INTERPRETATION_GUIDE).map(([key, guide]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-800 mb-1">{guide.title}</h5>
                      <p className="text-xs text-gray-600 mb-2">{guide.description}</p>
                      <ul className="space-y-1">
                        {guide.interpretation.map((item, index) => (
                          <li key={index} className="text-xs text-gray-700">
                            <span className="text-waterbase-600 mr-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Matching Scenarios */}
                {matchingScenarios.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800">Similar Situations</h4>
                    {matchingScenarios.map((scenario, index) => (
                      <div key={scenario.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-800">{scenario.title}</h5>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              scenario.urgency === 'low' ? 'text-green-600' :
                              scenario.urgency === 'medium' ? 'text-yellow-600' :
                              scenario.urgency === 'high' ? 'text-orange-600' :
                              'text-red-600'
                            )}
                          >
                            {scenario.urgency}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{scenario.description}</p>
                        <p className="text-xs text-gray-700 mb-2">{scenario.interpretation}</p>
                        <div className="bg-blue-50 p-2 rounded text-xs">
                          <span className="font-medium text-blue-800">Recommendation: </span>
                          <span className="text-blue-700">{scenario.actionRecommendation}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          <span className="font-medium">Real-world example:</span> {scenario.realWorldExample}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* General Guidance */}
                <div className="p-3 bg-waterbase-50 border border-waterbase-200 rounded-lg">
                  <h5 className="text-sm font-medium text-waterbase-800 mb-2">💡 Pro Tips</h5>
                  <ul className="space-y-1 text-xs text-waterbase-700">
                    <li>• Higher consensus (&gt;70%) means more reliable results</li>
                    <li>• More reports (&gt;10) provide better statistical confidence</li>
                    <li>• Outliers may indicate special conditions worth investigating</li>
                    <li>• Split peaks suggest complex pollution patterns</li>
                    <li>• Consider seasonal variations when planning actions</li>
                  </ul>
                </div>
              </TabsContent>
              
              <TabsContent value="debug" className="space-y-4 mt-0">
                {/* Raw Data Debug */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Debug Information
                  </h4>
                  
                  {/* WBSI Calculation Details */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-800 mb-2">WBSI Calculation</h5>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modal Severity (Peak):</span>
                        <span className="font-mono font-medium">{config.peak_severity}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">WBSI Display:</span>
                        <span className="font-mono font-medium">{config.wbsi_display}%</span>
                      </div>
                      {config.wbsi_display_shrunk && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">WBSI Shrunk:</span>
                          <span className="font-mono font-medium text-red-600">{config.wbsi_display_shrunk}%</span>
                        </div>
                      )}
                      {config.shrinkage_factor && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Shrinkage Factor:</span>
                          <span className="font-mono font-medium">{config.shrinkage_factor.toFixed(3)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Consensus:</span>
                        <span className="font-mono font-medium">{config.consensus_percentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Consensus Range:</span>
                        <span className="font-mono font-medium">{config.consensus_range[0]}% - {config.consensus_range[1]}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Raw Severity Values */}
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h5 className="text-sm font-medium text-yellow-800 mb-2">📊 Raw Severity Values Used</h5>
                    <p className="text-xs text-yellow-700 mb-2">
                      These are the actual severity percentages extracted from the reports:
                    </p>
                    <div className="max-h-32 overflow-y-auto">
                      <div className="grid grid-cols-6 gap-1">
                        {bar_data.map((item, index) => (
                          item.count > 0 && (
                            <div key={index} className="text-xs font-mono bg-white p-1 rounded border text-center">
                              <div className={cn(
                                "font-medium",
                                item.band === 'low' ? 'text-green-600' :
                                item.band === 'medium' ? 'text-yellow-600' :
                                item.band === 'high' ? 'text-orange-600' : 'text-red-600'
                              )}>
                                {item.severity}%
                              </div>
                              <div className="text-gray-500">{item.count.toFixed(1)}×</div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-yellow-600 mt-2">
                      Format: <span className="font-mono">Severity% (Count×)</span>
                    </p>
                  </div>

                  {/* Band Analysis */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-800 mb-2">📈 Severity Band Analysis</h5>
                    <div className="space-y-2">
                      {Object.entries(config.severity_bands).map(([band, percentage]) => (
                        <div key={band} className="flex items-center justify-between text-xs">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded mr-2"
                              style={{ backgroundColor: getSeverityBandColor(band) }}
                            />
                            <span className="capitalize font-medium">{band}:</span>
                          </div>
                          <span className="font-mono">{percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-blue-200 text-xs">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Critical Ratio:</span>
                        <span className="font-mono text-blue-800 font-medium">
                          {config.severity_bands.critical.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">High+Critical Combined:</span>
                        <span className="font-mono text-blue-800 font-medium">
                          {(config.severity_bands.high + config.severity_bands.critical).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Outliers */}
                  {outliers.length > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <h5 className="text-sm font-medium text-orange-800 mb-2">⚠️ Outlier Reports</h5>
                      <div className="space-y-1">
                        {outliers.map((outlier, index) => (
                          <div key={outlier.report_id} className="flex justify-between text-xs">
                            <span className="text-orange-700">Report #{outlier.report_id}:</span>
                            <span className="font-mono text-orange-800">
                              {outlier.severity}% (±{outlier.deviation.toFixed(1)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical Info */}
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-800 mb-2">🔧 Technical Details</h5>
                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex justify-between">
                        <span>Is Polymodal:</span>
                        <span className={config.is_polymodal ? 'text-red-600' : 'text-green-600'}>
                          {config.is_polymodal ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Reports:</span>
                        <span>{config.n_reports}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>KDE Points:</span>
                        <span>{kde_data.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Histogram Bins:</span>
                        <span>{bar_data.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Interpretation Note */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h5 className="text-sm font-medium text-green-800 mb-1">💡 What This Tells Us</h5>
                    <p className="text-xs text-green-700">
                      The WBSI of <strong>{config.wbsi_display}%</strong> comes from the modal severity (peak) of the distribution, 
                      not an average. This means <strong>{config.wbsi_display}%</strong> is where most reports cluster, 
                      representing the dominant pollution pattern in this area.
                      
                      {config.wbsi_display_shrunk && config.shrinkage_factor && (
                        <span className="block mt-2">
                          <strong>Small sample adjustment:</strong> With only {config.n_reports} reports, 
                          the shrunk value would be {config.wbsi_display_shrunk}% (factor: {config.shrinkage_factor.toFixed(3)}), 
                          but we show the modal severity for better user understanding.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default SeverityDistributionChart;
