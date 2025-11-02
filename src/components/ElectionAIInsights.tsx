import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Race, getFieldValue } from "../types/election";
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, Vote, Users, MapPin,
  ChevronDown, ChevronRight, Target, Zap, Eye, Timer, Bell, BellOff,
  Volume, VolumeX, Settings, Info, Send, X
} from "lucide-react";

interface AIInsight {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
  title: string;
  shortDescription: string;
  trend: 'warning' | 'positive' | 'info';
  probability: number; // 0-100
  confidence: number; // 0-100
  state?: 'active' | 'cooling-off' | 'muted';
  coolingOffMinutes?: number;
  rulesFired?: Rule[];
  keyMetrics?: KeyMetric[];
  details?: {
    affectedRaces?: any[];
    recommendations?: string[];
  };
  isMuted?: boolean;
  autoNotifyThreshold?: number;
}

interface Rule {
  id: string;
  name: string;
  condition: string;
  value: number;
  threshold: number;
  unit?: string;
  weight: number;
}

interface KeyMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'normal' | 'warning' | 'critical';
}

interface ElectionAIInsightsProps {
  races: Race[];
}

export function ElectionAIInsights({ 
  races, 
  compact = false, 
  listView = false,
  onClick 
}: ElectionAIInsightsProps & { 
  compact?: boolean;
  listView?: boolean;
  onClick?: () => void;
}) {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [mutedInsights, setMutedInsights] = useState<Set<string>>(new Set());
  const [autoNotifySettings, setAutoNotifySettings] = useState<Record<string, number>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDataSet, setSelectedDataSet] = useState<string>("");
  const [selectedRace, setSelectedRace] = useState<string>("");
  const [chatMessage, setChatMessage] = useState("");

  // Available data sets
  const availableDataSets = [
    { id: '2024', name: '2024 Election Data' },
    { id: '2023', name: '2023 Election Data' },
    { id: '2022', name: '2022 Election Data' },
    { id: 'synthetic', name: 'Synthetic Data' },
  ];

  // Get race type label
  const getRaceTypeLabel = (raceType: string): string => {
    const labels: Record<string, string> = {
      'president': 'Presidential',
      'senate': 'Senate',
      'house': 'House',
      'governor': 'Governor',
      'state_senate': 'State Senate',
      'state_house': 'State House',
      'mayor': 'Mayor',
      'local': 'Local'
    };
    return labels[raceType] || raceType;
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      console.log('Sending message:', { selectedDataSet, selectedRace, message: chatMessage });
      // Here you would process the AI chat request
      setChatMessage("");
    }
  };

  // Generate AI insights with probability, confidence, and rules
  const generateInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];
    
    // Close races analysis
    const closeRaces = races.filter(race => {
      const candidates = race.candidates.slice(0, 2);
      if (candidates.length < 2) return false;
      const votes1 = getFieldValue(candidates[0].votes) || 0;
      const votes2 = getFieldValue(candidates[1].votes) || 0;
      const total = votes1 + votes2;
      if (total === 0) return false;
      const margin = Math.abs(votes1 - votes2) / total;
      return margin < 0.05; // Less than 5% margin
    });
    
    if (closeRaces.length > 0) {
      insights.push({
        id: 'close-races',
        type: 'margins',
        severity: 'high',
        icon: <Target className="w-5 h-5" />,
        title: 'Close Race Margins',
        shortDescription: `${closeRaces.length} races with margins under 5%.`,
        trend: 'warning',
        probability: 89,
        confidence: 95,
        rulesFired: [
          {
            id: 'margin-threshold',
            name: 'Close Margin Detection',
            condition: 'margin < 5%',
            value: closeRaces.length,
            threshold: 1,
            weight: 0.9
          }
        ],
        keyMetrics: [
          {
            name: 'Closest Margin',
            value: Math.min(...closeRaces.map(race => {
              const candidates = race.candidates.slice(0, 2);
              const votes1 = getFieldValue(candidates[0].votes) || 0;
              const votes2 = getFieldValue(candidates[1].votes) || 0;
              const total = votes1 + votes2;
              return total > 0 ? Math.abs(votes1 - votes2) / total * 100 : 0;
            })),
            unit: '%',
            threshold: 5,
            status: 'warning'
          }
        ],
        details: {
          affectedRaces: closeRaces.slice(0, 3),
          recommendations: ["Monitor for potential recounts", "Verify reporting accuracy", "Prepare contingency analysis"]
        }
      });
    }

    // Uncalled races pattern
    const uncalledRaces = races.filter(r => getFieldValue(r.status) === 'NOT_CALLED');
    if (uncalledRaces.length > 3) {
      insights.push({
        id: 'uncalled-pattern',
        type: 'status',
        severity: 'medium',
        icon: <Vote className="w-5 h-5" />,
        title: 'High Uncalled Race Count',
        shortDescription: `${uncalledRaces.length} races remain uncalled.`,
        trend: 'info',
        probability: 76,
        confidence: 88,
        rulesFired: [
          {
            id: 'uncalled-threshold',
            name: 'Uncalled Count Threshold',
            condition: 'uncalled_count > 3',
            value: uncalledRaces.length,
            threshold: 3,
            weight: 0.7
          }
        ]
      });
    }

    // Candidate performance analysis
    const presidentialRaces = races.filter(r => getFieldValue(r.raceType) === 'PRESIDENT');
    if (presidentialRaces.length > 0) {
      insights.push({
        id: 'candidate-performance',
        type: 'analysis',
        severity: 'low',
        icon: <Users className="w-5 h-5" />,
        title: 'Candidate Performance Trends',
        shortDescription: `Analysis across ${presidentialRaces.length} presidential races.`,
        trend: 'positive',
        probability: 82,
        confidence: 79,
        rulesFired: [
          {
            id: 'performance-analysis',
            name: 'Performance Pattern Detection',
            condition: 'presidential_races > 0',
            value: presidentialRaces.length,
            threshold: 1,
            weight: 0.6
          }
        ]
      });
    }

    // Geographic distribution analysis
    const statePattern = [...new Set(races.map(r => r.state))];
    if (statePattern.length > 5) {
      insights.push({
        id: 'geographic-distribution',
        type: 'geography',
        severity: 'low',
        icon: <MapPin className="w-5 h-5" />,
        title: 'Geographic Distribution',
        shortDescription: `Coverage across ${statePattern.length} states.`,
        trend: 'info',
        probability: 71,
        confidence: 85,
        state: 'cooling-off',
        coolingOffMinutes: 15
      });
    }

    return insights.map(insight => ({
      ...insight,
      isMuted: mutedInsights.has(insight.id),
      autoNotifyThreshold: autoNotifySettings[insight.id] || 70
    }));
  };

  const insights = generateInsights();

  const toggleMute = (insightId: string) => {
    const newMuted = new Set(mutedInsights);
    if (newMuted.has(insightId)) {
      newMuted.delete(insightId);
    } else {
      newMuted.add(insightId);
    }
    setMutedInsights(newMuted);
  };

  const updateAutoNotify = (insightId: string, threshold: number) => {
    setAutoNotifySettings(prev => ({
      ...prev,
      [insightId]: threshold
    }));
  };

  // Confidence ring component
  const ConfidenceRing = ({ confidence, size = 40 }: { confidence: number; size?: number }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (confidence / 100) * circumference;
    
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/20"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="text-blue-600 dark:text-blue-400"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium">{confidence}%</span>
        </div>
      </div>
    );
  };

  if (compact) {
    // Compact version for summary cards
    const topInsight = insights[0];
    const warningCount = insights.filter(i => i.trend === 'warning').length;
    
    return (
      <Card className={onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""} onClick={onClick}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">AI Insights</p>
              <p className="text-2xl font-semibold">{insights.length}</p>
              <p className="text-xs text-muted-foreground">
                {warningCount > 0 ? `${warningCount} alert${warningCount > 1 ? 's' : ''}` : topInsight?.title || 'Analyzing...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (listView) {
    // Enhanced list view with probability, confidence, and rules
    return (
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded">
              <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            AI Election Insights
            <Badge variant="secondary" className="text-xs">
              {insights.length} insights
            </Badge>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Brain className="w-4 h-4 mr-2" />
                  Add AI Insights
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader className="space-y-0 pb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <DialogTitle>Election AI Insight Generator</DialogTitle>
                  </div>
                </DialogHeader>
                
                {/* Two dropdowns side by side */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Set</label>
                    <div className="relative">
                      <Select value={selectedDataSet} onValueChange={setSelectedDataSet}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a data set" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDataSets.map((dataSet) => (
                            <SelectItem key={dataSet.id} value={dataSet.id}>
                              <div className="flex items-center gap-2">
                                <Vote className="w-4 h-4 text-blue-600" />
                                <span>{dataSet.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedDataSet && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 p-0 hover:bg-muted rounded-sm"
                          onClick={() => setSelectedDataSet("")}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Race Selection</label>
                    <div className="relative">
                      <Select value={selectedRace} onValueChange={setSelectedRace}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a race" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {races.map((race) => (
                            <SelectItem key={race.id} value={race.id}>
                              <div className="flex items-center gap-2">
                                <Vote className="w-4 h-4 text-blue-600" />
                                <span>{getRaceTypeLabel(getFieldValue(race.race_type) || '')} - {getFieldValue(race.state)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedRace && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 p-0 hover:bg-muted rounded-sm"
                          onClick={() => setSelectedRace("")}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Central AI Assistant Area */}
                <div className="flex-1 bg-muted/30 rounded-lg p-8 mb-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mx-auto">
                    <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-lg">Election AI Assistant</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Select a data set or race above, then ask me to analyze voting patterns, 
                    predict race outcomes, assess competitive races, or provide electoral insights.
                  </p>
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about voting trends, race competitiveness, turnout analysis..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    size="sm"
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 pb-3 border-b text-sm font-medium text-muted-foreground">
              <div className="col-span-1 text-center">Risk</div>
              <div className="col-span-4">Insight & Probability</div>
              <div className="col-span-6">Description</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>
            
            {/* Insight rows */}
            {insights.map((insight) => (
              <Collapsible 
                key={insight.id}
                open={expandedInsight === insight.id}
                onOpenChange={(open) => setExpandedInsight(open ? insight.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <div className={`grid grid-cols-12 gap-4 py-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group ${
                    insight.isMuted ? 'opacity-50' : ''
                  }`}>
                    <div className="col-span-1 flex justify-center items-center">
                      <div className="relative">
                        <ConfidenceRing confidence={insight.confidence} size={32} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`p-1 rounded ${{
                            warning: 'text-orange-600 dark:text-orange-400',
                            info: 'text-blue-600 dark:text-blue-400',
                            positive: 'text-green-600 dark:text-green-400'
                          }[insight.trend] || 'text-purple-600 dark:text-purple-400'}`}>
                            {insight.icon}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{insight.title}</span>
                        {insight.state === 'cooling-off' && (
                          <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400">
                            <Timer className="w-3 h-3 mr-1" />
                            {insight.coolingOffMinutes}m
                          </Badge>
                        )}
                        {expandedInsight === insight.id ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{insight.probability}% probability</span>
                        <Badge variant="outline" className="text-xs">
                          {insight.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="col-span-6">
                      <p className="text-sm">{insight.shortDescription}</p>
                    </div>
                    <div className="col-span-1 flex justify-center items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute(insight.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        {insight.isMuted ? (
                          <VolumeX className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Volume className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="px-4 pb-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 ml-8">
                      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                        {/* Rules Fired */}
                        {insight.rulesFired && insight.rulesFired.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <Settings className="w-4 h-4" />
                              Rules Fired
                            </h4>
                            <div className="grid gap-2">
                              {insight.rulesFired.map((rule) => (
                                <div key={rule.id} className="flex items-center justify-between text-sm p-2 bg-background rounded border">
                                  <div>
                                    <span className="font-medium">{rule.name}</span>
                                    <div className="text-xs text-muted-foreground">{rule.condition}</div>
                                  </div>
                                  <div className="text-right">
                                    <div>{rule.value}{rule.unit && ` ${rule.unit}`}</div>
                                    <div className="text-xs text-muted-foreground">Weight: {rule.weight}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Key Metrics */}
                        {insight.keyMetrics && insight.keyMetrics.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Key Metrics
                            </h4>
                            <div className="grid gap-2">
                              {insight.keyMetrics.map((metric, index) => (
                                <div key={index} className="flex items-center justify-between text-sm p-2 bg-background rounded border">
                                  <span>{metric.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span>{metric.value} {metric.unit}</span>
                                    <Badge variant={metric.status === 'critical' ? 'destructive' : metric.status === 'warning' ? 'secondary' : 'outline'} className="text-xs">
                                      {metric.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Recommendations */}
                        {insight.details?.recommendations && insight.details.recommendations.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <Info className="w-4 h-4" />
                              Recommendations
                            </h4>
                            <ul className="text-sm space-y-1">
                              {insight.details.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 bg-current rounded-full mt-2 flex-shrink-0"></span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Auto-notify threshold */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Bell className="w-4 h-4" />
                          <span className="text-sm">Auto-notify at</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={insight.autoNotifyThreshold}
                            onChange={(e) => updateAutoNotify(insight.id, parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm w-12">{insight.autoNotifyThreshold}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default card view
  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <Card key={insight.id} className={`${insight.isMuted ? 'opacity-60' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${{
                high: 'bg-red-100 dark:bg-red-900/20',
                medium: 'bg-yellow-100 dark:bg-yellow-900/20',
                low: 'bg-blue-100 dark:bg-blue-900/20'
              }[insight.severity]}`}>
                <div className={`${{
                  warning: 'text-red-600 dark:text-red-400',
                  info: 'text-blue-600 dark:text-blue-400',
                  positive: 'text-green-600 dark:text-green-400'
                }[insight.trend]}`}>
                  {insight.icon}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{insight.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {insight.probability}% confidence
                  </Badge>
                  {insight.state === 'cooling-off' && (
                    <Badge variant="outline" className="text-xs text-blue-600">
                      <Timer className="w-3 h-3 mr-1" />
                      Cooling off
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{insight.shortDescription}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleMute(insight.id)}
                className="text-muted-foreground"
              >
                {insight.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}