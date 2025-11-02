import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState } from "react";
import { Clock, CheckCircle, AlertCircle, Database, User, X, ChevronDown, ChevronUp } from "lucide-react";
import { Race, Candidate, Party, getFieldValue, isFieldOverridden, FieldOverride, revertOverride } from "../types/election";
import { InlineTextEdit, InlineNumberEdit, InlineSelectEdit, InlineBooleanEdit } from "./InlineEditField";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { updateRacesFieldOverride, updateRaceFieldOverride, updateCandidateFieldOverride, updateCandidatesFieldOverride, updateRaceCandidatesFieldOverride } from "../data/overrideFieldMappings";
import { EditImageDialog } from "./EditImageDialog";

interface RaceCardProps {
  race: Race;
  onUpdateRace: (race: Race) => void;
  parties?: Party[];
}

const statusConfig = {
  NOT_CALLED: { label: 'Not Called', color: 'bg-gray-500', icon: Clock },
  PROJECTED: { label: 'Projected', color: 'bg-blue-500', icon: AlertCircle },
  CALLED: { label: 'Called', color: 'bg-green-500', icon: CheckCircle },
  RECOUNT: { label: 'Recount', color: 'bg-yellow-500', icon: AlertCircle }
};

const statusOptions = [
  { value: 'NOT_CALLED' as const, label: 'Not Called' },
  { value: 'PROJECTED' as const, label: 'Projected' },
  { value: 'CALLED' as const, label: 'Called' },
  { value: 'RECOUNT' as const, label: 'Recount' }
];

const partyOptions = [
  { value: 'DEM' as const, label: 'Democrat' },
  { value: 'REP' as const, label: 'Republican' },
  { value: 'IND' as const, label: 'Independent' },
  { value: 'GRN' as const, label: 'Green' },
  { value: 'LIB' as const, label: 'Libertarian' },
  { value: 'OTH' as const, label: 'Other' }
];

const raceTypeOptions = [
  { value: 'PRESIDENT' as const, label: 'Presidential' },
  { value: 'SENATE' as const, label: 'Senate' },
  { value: 'HOUSE' as const, label: 'House' },
  { value: 'GOVERNOR' as const, label: 'Governor' },
  { value: 'LOCAL' as const, label: 'Local' }
];

// Fallback colors if party data is not available
const fallbackPartyColors: Record<string, string> = {
  'Dem': '#0015BC',
  'GOP': '#E81B23',
  'Ind': '#9333EA',
  'Grn': '#2fa82f',
  'Lib': '#efcb0a',
  'Oth': '#808080'
};

// Helper function to get party color from database or fallback
const getPartyColor = (partyCode: string, parties?: Party[]): string => {
  if (parties && parties.length > 0) {
    const party = parties.find(p => p.code === partyCode);
    if (party) {
      return party.colors.primary;
    }
  }
  return fallbackPartyColors[partyCode] || '#808080';
};

export function RaceCard({ race, onUpdateRace, parties }: RaceCardProps) {
  const [editingImageCandidate, setEditingImageCandidate] = useState<string | null>(null);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  
  const statusValue = getFieldValue(race.status);
  const titleValue = getFieldValue(race.title);
  const officeValue = getFieldValue(race.office);
  const raceTypeValue = getFieldValue(race.raceType);
  const reportingValue = getFieldValue(race.reportingPercentage);
  const precinctsReportingValue = getFieldValue(race.precincts_reporting || 0);
  const calledTimestampValue = getFieldValue(race.called_timestamp || '');
  const totalVotesValue = getFieldValue(race.totalVotes);

  // Helper functions to update specific fields
  const updateRaceField = async <K extends keyof Race>(fieldName: K, newValue: Race[K]) => {
    // First update the local state
    const updatedRace = { ...race, [fieldName]: newValue };
    onUpdateRace(updatedRace);

    // Then persist to database if it's a supported override field
    const overrideableFields = ['reportingPercentage', 'precincts_reporting', 'precincts_total', 'status', 'called_timestamp', 'totalVotes'];

    if (overrideableFields.includes(fieldName as string)) {
      try {
        const result = await updateRaceFieldOverride(
          race.race_results_id,
          fieldName as string,
          newValue,
          `Updated via UI`
        );

        if (!result.success) {
          console.error(`Failed to persist ${fieldName} override:`, result.error);
          // Could show a toast notification here
        } else {
          console.log(`Successfully persisted ${fieldName} override for race results id: ${race.race_id}`);
        }
      } catch (error) {
        console.error(`Error persisting ${fieldName} override:`, error);
      }
    }

    const overrideableRacesFields = ['title'];

    if (overrideableRacesFields.includes(fieldName as string)) {
      try {
        const result = await updateRacesFieldOverride(
          race.race_id,
          fieldName as string,
          newValue,
          `Field ${fieldName} updated via UI`
        );

        if (!result.success) {
          console.error(`Failed to persist ${fieldName} override:`, result.error);
          // Could show a toast notification here
        } else {
          console.log(`Successfully persisted ${fieldName} override for race id: ${race.race_id}`);
        }
      } catch (error) {
        console.error(`Error persisting ${fieldName} override:`, error);
      }
    }
  };

  const revertAllOverrides = () => {
    return false;
    if (isFieldOverridden(race.title)) updateRaceField('title', null);
    if (isFieldOverridden(race.reportingPercentage)) updateRaceField('reportingPercentage', null);
    if (isFieldOverridden(race.precincts_reporting)) updateRaceField('precincts_reporting', null);
    if (isFieldOverridden(race.status)) updateRaceField('status', null);
    if (isFieldOverridden(race.status)) updateRaceField('totalVotes', null);

    race.candidates.map(candidate => {
      if (isFieldOverridden(candidate.name)) updateCandidateField(candidate.id, 'name', null);
      if (isFieldOverridden(candidate.incumbent)) updateCandidateField(candidate.id, 'incumbent', null);
      if (isFieldOverridden(candidate.winner)) updateCandidateField(candidate.id, 'winner', null);
      if (isFieldOverridden(candidate.votes)) updateCandidateField(candidate.id, 'votes', null);
      if (isFieldOverridden(candidate.percentage)) updateCandidateField(candidate.id, 'percentage', null);
      if (isFieldOverridden(candidate.withdrew)) updateCandidateField(candidate.id, 'withdrew', null);
    });

    const revertedRace: Race = {
      ...race,
      title: isFieldOverridden(race.title) ? revertOverride(race.title) : race.title,
      office: isFieldOverridden(race.office) ? revertOverride(race.office) : race.office,
      raceType: isFieldOverridden(race.raceType) ? revertOverride(race.raceType) : race.raceType,
      status: isFieldOverridden(race.status) ? revertOverride(race.status) : race.status,
      reportingPercentage: isFieldOverridden(race.reportingPercentage) ? revertOverride(race.reportingPercentage) : race.reportingPercentage,
      precincts_reporting: isFieldOverridden(race.precincts_reporting) ? revertOverride(race.precincts_reporting as FieldOverride<number>) : race.precincts_reporting,
      called_timestamp: isFieldOverridden(race.called_timestamp) ? revertOverride(race.called_timestamp as FieldOverride<string>) : race.called_timestamp,
      totalVotes: isFieldOverridden(race.totalVotes) ? revertOverride(race.totalVotes) : race.totalVotes,
      candidates: race.candidates.map(candidate => ({
        ...candidate,
        name: isFieldOverridden(candidate.name) ? revertOverride(candidate.name) : candidate.name,
        party: isFieldOverridden(candidate.party) ? revertOverride(candidate.party) : candidate.party,
        votes: isFieldOverridden(candidate.votes) ? revertOverride(candidate.votes) : candidate.votes,
        percentage: isFieldOverridden(candidate.percentage) ? revertOverride(candidate.percentage) : candidate.percentage,
        incumbent: isFieldOverridden(candidate.incumbent) ? revertOverride(candidate.incumbent) : candidate.incumbent,
        winner: isFieldOverridden(candidate.winner) ? revertOverride(candidate.winner as FieldOverride<boolean>) : candidate.winner,
        withdrew: isFieldOverridden(candidate.withdrew) ? revertOverride(candidate.withdrew as FieldOverride<boolean>) : candidate.withdrew,
        headshot: isFieldOverridden(candidate.headshot) ? revertOverride(candidate.headshot as FieldOverride<string>) : candidate.headshot,
      })),
      lastUpdated: new Date().toISOString()
    };

    onUpdateRace(revertedRace);
  };

  const revertCandidateOverrides = (candidateId: string) => {
    return false;
    const updatedCandidates = race.candidates.map(candidate => {
      if (candidate.id === candidateId) {
        console.log('cccccccc')
        console.log(candidate)
        if (isFieldOverridden(candidate.name)) updateCandidateField(candidate.id, 'name', null);
        if (isFieldOverridden(candidate.incumbent)) updateCandidateField(candidate.id, 'incumbent', null);
        if (isFieldOverridden(candidate.winner)) updateCandidateField(candidate.id, 'winner', null);
        if (isFieldOverridden(candidate.votes)) updateCandidateField(candidate.id, 'votes', null);
        if (isFieldOverridden(candidate.percentage)) updateCandidateField(candidate.id, 'percentage', null);
        if (isFieldOverridden(candidate.withdrew)) updateCandidateField(candidate.id, 'withdrew', null);

        return {
          ...candidate,
          name: isFieldOverridden(candidate.name) ? revertOverride(candidate.name) : candidate.name,
          party: isFieldOverridden(candidate.party) ? revertOverride(candidate.party) : candidate.party,
          votes: isFieldOverridden(candidate.votes) ? revertOverride(candidate.votes) : candidate.votes,
          percentage: isFieldOverridden(candidate.percentage) ? revertOverride(candidate.percentage) : candidate.percentage,
          incumbent: isFieldOverridden(candidate.incumbent) ? revertOverride(candidate.incumbent) : candidate.incumbent,
          winner: isFieldOverridden(candidate.winner) ? revertOverride(candidate.winner as FieldOverride<boolean>) : candidate.winner,
          withdrew: isFieldOverridden(candidate.withdrew) ? revertOverride(candidate.withdrew as FieldOverride<boolean>) : candidate.withdrew,
          headshot: isFieldOverridden(candidate.headshot) ? revertOverride(candidate.headshot as FieldOverride<string>) : candidate.headshot,
        };
      }
      return candidate;
    });

    // Recalculate totals
    const calculatedTotalVotes = updatedCandidates.reduce((sum, c) => sum + getFieldValue(c.votes), 0);
    const candidatesWithPercentages = updatedCandidates.map(c => {
      if (!isFieldOverridden(c.percentage)) {
        return {
          ...c,
          percentage: calculatedTotalVotes > 0 ? Math.round((getFieldValue(c.votes) / calculatedTotalVotes) * 100 * 100) / 100 : 0
        };
      }
      return c;
    });

    const updatedTotalVotes = isFieldOverridden(race.totalVotes) ? race.totalVotes : calculatedTotalVotes;

    const updatedRace = {
      ...race,
      candidates: candidatesWithPercentages,
      totalVotes: updatedTotalVotes,
      lastUpdated: new Date().toISOString()
    };
    onUpdateRace(updatedRace);
  };

  const updateCandidateField = async <K extends keyof Candidate>(candidateId: string, fieldName: K, newValue: Candidate[K]) => {
    const updatedCandidates = race.candidates.map(candidate =>
      candidate.id === candidateId
        ? { ...candidate, [fieldName]: newValue }
        : candidate
    );

    // Only auto-calculate percentages and total votes if they haven't been manually overridden
    const calculatedTotalVotes = updatedCandidates.reduce((sum, c) => sum + getFieldValue(c.votes), 0);

    const candidatesWithPercentages = updatedCandidates.map(c => {
      // Only auto-calculate percentage if it's not overridden
      if (!isFieldOverridden(c.percentage)) {
        return {
          ...c,
          percentage: calculatedTotalVotes > 0 ? Math.round((getFieldValue(c.votes) / calculatedTotalVotes) * 100 * 100) / 100 : 0
        };
      }
      return c;
    });

    // Only update total votes if it's not overridden
    const updatedTotalVotes = isFieldOverridden(race.totalVotes) ? race.totalVotes : calculatedTotalVotes;

    const updatedRace = {
      ...race,
      candidates: candidatesWithPercentages,
      totalVotes: updatedTotalVotes,
      lastUpdated: new Date().toISOString()
    };
    onUpdateRace(updatedRace);

    const updatedCandidate = race.candidates.find(c => c.id === candidateId);

    // Persist to database if it's a supported override field
    const overrideableFields = ['votes', 'percentage', 'winner', 'electoralVotes'];

    if (overrideableFields.includes(fieldName as string)) {
      try {
        console.log('updateCandidateFieldOverrideeeeeeeee');
        console.log(race.candidates);
        console.log(candidateId);      
        const updateCandidateId = updatedCandidate.candidate_results_id;
        console.log(updatedCandidate);
        const result = await updateCandidateFieldOverride(
          updateCandidateId,
          fieldName as string,
          newValue,
          `Field ${fieldName} updated via UI`
        );

        if (!result.success) {
          console.error(`Failed to persist candidate ${fieldName} override:`, result.error);
          // Could show a toast notification here
        } else {
          console.log(`Successfully persisted ${fieldName} override for candidate results id: ${updateCandidateId}`);
        }
      } catch (error) {
        console.error(`Error persisting candidate ${fieldName} override:`, error);
      }
    }

    const overrideableCandidatesFields = ['incumbent', 'name', 'headshot'];

    if (overrideableCandidatesFields.includes(fieldName as string)) {
      try {
        const result = await updateCandidatesFieldOverride(
          candidateId,
          fieldName as string,
          newValue,
          `Field ${fieldName} updated via UI`
        );

        if (!result.success) {
          console.error(`Failed to persist candidate ${fieldName} override:`, result.error);
          // Could show a toast notification here
        } else {
          console.log(`Successfully persisted ${fieldName} override for candidate id: ${candidateId}`);
        }
      } catch (error) {
        console.error(`Error persisting candidate ${fieldName} override:`, error);
      }
    }

    const overrideableRaceCandidatesFields = ['withdrew'];

    if (overrideableRaceCandidatesFields.includes(fieldName as string)) {
      try {
        const result = await updateRaceCandidatesFieldOverride(
          updatedCandidate.race_candidates_id,
          fieldName as string,
          newValue,
          `Field ${fieldName} updated via UI`
        );

        if (!result.success) {
          console.error(`Failed to persist candidate ${fieldName} override:`, result.error);
          // Could show a toast notification here
        } else {
          console.log(`Successfully persisted ${fieldName} override for race candidate id: ${updatedCandidate.race_candidates_id}`);
        }
      } catch (error) {
        console.error(`Error persisting candidate ${fieldName} override:`, error);
      }
    }
  };
  
  const statusInfo = statusConfig[statusValue];
  const StatusIcon = statusInfo.icon;
  
  const sortedCandidates = [...race.candidates].sort((a, b) => {
    const aVotes = getFieldValue(a.votes);
    const bVotes = getFieldValue(b.votes);
    return bVotes - aVotes;
  });

  // Show only first 3 candidates when collapsed
  const visibleCandidates = showAllCandidates ? sortedCandidates : sortedCandidates.slice(0, 3);
  const hasMoreCandidates = sortedCandidates.length > 3;

  // Check if race has any overrides
  const hasOverrides = isFieldOverridden(race.title) || 
                      isFieldOverridden(race.office) ||
                      isFieldOverridden(race.raceType) ||
                      isFieldOverridden(race.status) || 
                      isFieldOverridden(race.reportingPercentage) ||
                      isFieldOverridden(race.precincts_reporting) ||
                      isFieldOverridden(race.called_timestamp) ||
                      isFieldOverridden(race.totalVotes) ||
                      race.candidates.some(c => 
                        isFieldOverridden(c.name) || 
                        isFieldOverridden(c.party) || 
                        isFieldOverridden(c.votes) ||
                        isFieldOverridden(c.percentage) ||
                        isFieldOverridden(c.winner) ||
                        isFieldOverridden(c.incumbent) ||
                        isFieldOverridden(c.withdrew) ||
                        isFieldOverridden(c.headshot)
                      );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <InlineTextEdit
                field={race.title}
                fieldName="Title"
                onUpdate={(newTitle) => updateRaceField('title', newTitle)}
              >
                <CardTitle className="text-lg">{titleValue}</CardTitle>
              </InlineTextEdit>
              {hasOverrides && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-800">
                    <Database className="h-3 w-3 mr-1" />
                    Modified
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      revertAllOverrides();
                    }}
                    className="h-5 w-5 p-0 hover:bg-amber-100 hover:text-amber-900"
                    title="Clear all overrides"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {/*<InlineTextEdit
                  field={race.office}
                  fieldName="Office"
                  onUpdate={(newOffice) => updateRaceField('office', newOffice)}
                >
                  <span>{officeValue}</span>
                </InlineTextEdit>*/}
                <span>{officeValue}</span>
                <span>•</span>
                {/*<InlineSelectEdit
                  field={race.raceType}
                  fieldName="Race Type"
                  onUpdate={(newRaceType) => updateRaceField('raceType', newRaceType)}
                  options={raceTypeOptions}
                >
                  <span>{raceTypeValue}</span>
                </InlineSelectEdit>*/}
                <span>{raceTypeValue}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{race.state}</span>
                {race.district && <span>• District {race.district}</span>}
                <InlineNumberEdit
                  field={race.reportingPercentage}
                  fieldName="Reporting %"
                  onUpdate={(newReporting) => updateRaceField('reportingPercentage', newReporting)}
                  min={0}
                  max={100}
                  step={0.1}
                >
                  <span>• {reportingValue}% reporting</span>
                </InlineNumberEdit>
                {race.precincts_total && (
                  <InlineNumberEdit
                    field={race.precincts_reporting || 0}
                    fieldName="Precincts Reporting"
                    onUpdate={(newPrecincts) => updateRaceField('precincts_reporting', newPrecincts)}
                    min={0}
                    max={race.precincts_total}
                    step={1}
                  >
                    <span>• {precinctsReportingValue}/{race.precincts_total} precincts</span>
                  </InlineNumberEdit>
                )}
              </div>
              {race.uncontested && (
                <div className="text-sm text-amber-600">
                  • Uncontested
                </div>
              )}
              {race.num_elect && race.num_elect > 1 && (
                <div className="text-sm text-muted-foreground">
                  • {race.num_elect} seats to elect
                </div>
              )}
              {calledTimestampValue && statusValue === 'CALLED' && (
                <div className="text-sm text-green-600">
                  • Called: {new Date(calledTimestampValue).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InlineSelectEdit
              field={race.status}
              fieldName="Status"
              onUpdate={(newStatus) => updateRaceField('status', newStatus)}
              options={statusOptions}
            >
              <Badge variant="outline" className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </InlineSelectEdit>

          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {visibleCandidates.map((candidate) => {
            const candidateName = getFieldValue(candidate.name);
            const candidateParty = getFieldValue(candidate.party);
            const candidateVotes = getFieldValue(candidate.votes);
            const candidateIncumbent = getFieldValue(candidate.incumbent);
            const candidateWinner = getFieldValue(candidate.winner);
            const candidateWithdrew = getFieldValue(candidate.withdrew || false);

            const candidateHasOverrides = isFieldOverridden(candidate.name) ||
                                        isFieldOverridden(candidate.party) ||
                                        isFieldOverridden(candidate.votes) ||
                                        isFieldOverridden(candidate.percentage) ||
                                        isFieldOverridden(candidate.incumbent) ||
                                        isFieldOverridden(candidate.winner) ||
                                        isFieldOverridden(candidate.withdrew) ||
                                        isFieldOverridden(candidate.headshot);

            return (
              <div key={candidate.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getPartyColor(candidateParty, parties) }}
                    />
                    <button
                      onClick={() => setEditingImageCandidate(candidate.id)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={getFieldValue(candidate.headshot || '')} 
                          alt={candidateName} 
                        />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <InlineTextEdit
                      field={candidate.name}
                      fieldName="Name"
                      onUpdate={(newName) => updateCandidateField(candidate.id, 'name', newName)}
                    >
                      <span className="font-medium">{candidateName}</span>
                    </InlineTextEdit>
                    {/*<InlineSelectEdit
                      field={candidate.party}
                      fieldName="Party"
                      onUpdate={(newParty) => updateCandidateField(candidate.id, 'party', newParty)}
                      options={partyOptions}
                    >
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {candidateParty}
                      </Badge>
                    </InlineSelectEdit>*/}
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {candidateParty}
                    </Badge>
                    <InlineBooleanEdit
                      field={candidate.incumbent}
                      fieldName="Incumbent"
                      onUpdate={(newIncumbent) => updateCandidateField(candidate.id, 'incumbent', newIncumbent)}
                    >
                      {candidateIncumbent && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          INC
                        </Badge>
                      )}
                    </InlineBooleanEdit>
                    <InlineBooleanEdit
                      field={candidate.winner}
                      fieldName="Winner"
                      onUpdate={(newWinner) => updateCandidateField(candidate.id, 'winner', newWinner)}
                    >
                      {candidateWinner && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </InlineBooleanEdit>
                    <InlineBooleanEdit
                      field={candidate.withdrew || false}
                      fieldName="Withdrew"
                      onUpdate={(newWithdrew) => updateCandidateField(candidate.id, 'withdrew', newWithdrew)}
                    >
                      {candidateWithdrew && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0">
                          WITHDREW
                        </Badge>
                      )}
                    </InlineBooleanEdit>
                    {candidateHasOverrides && (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
                          Modified
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            revertCandidateOverrides(candidate.id);
                          }}
                          className="h-5 w-5 p-0 hover:bg-blue-100 hover:text-blue-900"
                          title="Clear candidate overrides"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {candidate.ballot_order && (
                      <span className="text-xs text-muted-foreground">
                        #{candidate.ballot_order}
                      </span>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <InlineNumberEdit
                      field={candidate.percentage}
                      fieldName="Percentage"
                      onUpdate={(newPercentage) => updateCandidateField(candidate.id, 'percentage', newPercentage)}
                      min={0}
                      max={100}
                      step={0.1}
                    >
                      <div className="font-medium">{getFieldValue(candidate.percentage)}%</div>
                    </InlineNumberEdit>&nbsp;&nbsp;
                    <InlineNumberEdit
                      field={candidate.votes}
                      fieldName="Votes"
                      onUpdate={(newVotes) => updateCandidateField(candidate.id, 'votes', newVotes)}
                      min={0}
                      step={1}
                      className="text-sm text-muted-foreground"
                    >
                      <span>{candidateVotes?.toLocaleString()}</span>
                    </InlineNumberEdit>
                  </div>
                </div>
                <Progress value={getFieldValue(candidate.percentage)} className="h-2" />
              </div>
            );
          })}
          
          {/* Expand/Collapse Button */}
          {hasMoreCandidates && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCandidates(!showAllCandidates)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showAllCandidates ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show {sortedCandidates.length - 3} More
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <div className="pt-2 border-t text-sm text-muted-foreground">
          <div className="flex justify-between">
            <InlineNumberEdit
              field={race.totalVotes}
              fieldName="Total Votes"
              onUpdate={(newTotalVotes) => updateRaceField('totalVotes', newTotalVotes)}
              min={0}
              step={1}
            >
              <span>Total Votes: {totalVotesValue.toLocaleString()}</span>
            </InlineNumberEdit>
            <div className="flex items-center gap-2">
              <span>Updated: {new Date(race.lastUpdated).toLocaleTimeString()}</span>
              {race.lastApUpdate && (
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  AP: {new Date(race.lastApUpdate).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Edit Image Dialog */}
      {editingImageCandidate && (() => {
        const candidate = race.candidates.find(c => c.id === editingImageCandidate);
        if (!candidate) return null;
        
        return (
          <EditImageDialog
            isOpen={true}
            onClose={() => setEditingImageCandidate(null)}
            candidate={{
              name: getFieldValue(candidate.name),
              party: getFieldValue(candidate.party),
              imageUrl: getFieldValue(candidate.headshot || '')
            }}
            onImageUpdate={(imageUrl) => {
              updateCandidateField(candidate.id, 'headshot', imageUrl);
              setEditingImageCandidate(null);
            }}
            hasImageOverride={isFieldOverridden(candidate.headshot)}
            hasNameOverride={isFieldOverridden(candidate.name)}
            hasPartyOverride={isFieldOverridden(candidate.party)}
          />
        );
      })()}
    </Card>
  );
}