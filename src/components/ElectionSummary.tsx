import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { EditImageDialog } from "./EditImageDialog";
import { Race, getFieldValue, isFieldOverridden, Candidate } from "../types/election";
import { Crown, Building, Home, BarChart3, Camera, User } from "lucide-react";
import uploadIcon from '../assets/68d53c13c3ad8229e8063692f187aaceaea0559d.png';
import newImageExample from '../assets/d44c4f8fd84167f69792e0ecbe2c26b82fcb83f4.png';
import { fetchBOPData, getBOPSummary, BOPData } from "../data/bopData";

interface ElectionSummaryProps {
  races: Race[];
  onUpdateRace: (race: Race) => void;
}

export function ElectionSummary({ races, onUpdateRace }: ElectionSummaryProps) {
  const [editingCandidate, setEditingCandidate] = useState<{ candidateId: string; raceId: string } | null>(null);
  const [bopData, setBopData] = useState<BOPData | null>(null);
  const [loadingBOP, setLoadingBOP] = useState(false);

  // Get the current year from races (assuming all races are from the same year)
  const currentYear = useMemo(() => {
    if (races.length > 0) {
      return parseInt(races[0].year);
    }
    return new Date().getFullYear();
  }, [races]);

  // Fetch BOP data when year changes
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoadingBOP(true);
      try {
        const data = await fetchBOPData(currentYear);
        console.log('BOP data received in ElectionSummary:', {
          year: currentYear,
          hasData: !!data,
          senateData: data?.senate,
          houseData: data?.house
        });
        if (mounted) {
          setBopData(data);
        }
      } catch (error) {
        console.error('Failed to fetch BOP data:', error);
      } finally {
        if (mounted) {
          setLoadingBOP(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [currentYear]);

  const summaryData = useMemo(() => {
    const presidentialRaces = races.filter(r => getFieldValue(r.raceType) === 'PRESIDENTIAL');
    const senateRaces = races.filter(r => getFieldValue(r.raceType) === 'SENATE');
    const houseRaces = races.filter(r => getFieldValue(r.raceType) === 'HOUSE');
    const governorRaces = races.filter(r => getFieldValue(r.raceType) === 'GOVERNOR');

    // Get presidential candidates
    const presidentialRace = presidentialRaces[0];
    const demCandidate = presidentialRace?.candidates.find(c => getFieldValue(c.party) === 'Dem');
    const repCandidate = presidentialRace?.candidates.find(c => getFieldValue(c.party) === 'GOP');

    // Calculate race status counts
    const getStatusCounts = (raceList: Race[], raceTypeName?: string) => {
      const called = raceList.filter(r => getFieldValue(r.status) === 'CALLED').length;
      const projected = raceList.filter(r => getFieldValue(r.status) === 'PROJECTED').length;
      const uncalled = raceList.filter(r => getFieldValue(r.status) === 'NOT_CALLED').length;
      const total = raceList.length;
      if (raceTypeName) {
        console.log(`${raceTypeName} status counts:`, { called, projected, uncalled, total });
      }
      return { called, projected, uncalled, total };
    };

    // Calculate party seat counts for Senate and House
    const getSenatePartyCounts = () => {
      // Use BOP data if available
      if (bopData?.senate) {
        const summary = getBOPSummary(bopData.senate);
        console.log('Senate BOP summary:', summary);
        return {
          demSeats: summary.demTotal,
          repSeats: summary.repTotal,
          indSeats: summary.indTotal,
          uncalledSeats: summary.undecided
        };
      }

      // Fallback to calculating from races
      const senateCalledRaces = senateRaces.filter(r => getFieldValue(r.status) === 'CALLED');
      let demSeats = 0, repSeats = 0, indSeats = 0;

      senateCalledRaces.forEach(race => {
        const winner = race.candidates.find(c => getFieldValue(c.votes) === Math.max(...race.candidates.map(candidate => getFieldValue(candidate.votes) || 0)));
        if (winner) {
          const party = getFieldValue(winner.party);
          if (party === 'Dem') demSeats++;
          else if (party === 'GOP') repSeats++;
          else if (party === 'Ind') indSeats++;
        }
      });

      const uncalledSeats = 100 - (demSeats + repSeats + indSeats);
      return { demSeats, repSeats, indSeats, uncalledSeats };
    };

    const getHousePartyCounts = () => {
      // Use BOP data if available
      if (bopData?.house) {
        const summary = getBOPSummary(bopData.house);
        console.log('House BOP summary:', summary);
        return {
          demSeats: summary.demTotal,
          repSeats: summary.repTotal,
          indSeats: summary.indTotal,
          uncalledSeats: summary.undecided
        };
      }

      // Fallback to calculating from races
      const houseCalledRaces = houseRaces.filter(r => getFieldValue(r.status) === 'CALLED');
      let demSeats = 0, repSeats = 0, indSeats = 0;

      houseCalledRaces.forEach(race => {
        const winner = race.candidates.find(c => getFieldValue(c.votes) === Math.max(...race.candidates.map(candidate => getFieldValue(candidate.votes) || 0)));
        if (winner) {
          const party = getFieldValue(winner.party);
          if (party === 'Dem') demSeats++;
          else if (party === 'GOP') repSeats++;
          else if (party === 'Ind') indSeats++;
        }
      });

      const uncalledSeats = 435 - (demSeats + repSeats + indSeats);
      return { demSeats, repSeats, indSeats, uncalledSeats };
    };

    // Calculate electoral votes for presidential race
    const getElectoralVotes = () => {
      let demVotes = 0, repVotes = 0, uncalledVotes = 0;

      console.log('ppppppppppv')
      console.log(presidentialRaces)

      console.log('Calculating electoral votes for', presidentialRaces.length, 'presidential races');

      presidentialRaces.forEach(race => {
        if (race.state !== 'National') {
          const status = getFieldValue(race.status);
          const stateElectoralVotes = race.electoralVotes || 0; // Total electoral votes for the state
          //console.log(`Race ${race.state}: status=${status}, state electoral=${stateElectoralVotes}`);

          // Check if any candidate has won electoral votes
          let electoralVotesAssigned = false;
          race.candidates.forEach(candidate => {
            const candidateElectoralVotes = candidate.electoralVotes || 0;
            if (candidateElectoralVotes > 0) {
              electoralVotesAssigned = true;
              const party = getFieldValue(candidate.party);
              console.log(`  Candidate ${getFieldValue(candidate.name)} (${party}) won ${candidateElectoralVotes} electoral votes`);
              if (party === 'Dem') {
                demVotes += candidateElectoralVotes;
              } else if (party === 'REP' || party === 'GOP') {
                repVotes += candidateElectoralVotes;
              }
            }
          });

          // If no candidate has electoral votes assigned yet, count as uncalled
          if (!electoralVotesAssigned) {
            uncalledVotes += stateElectoralVotes;
          }
        }
      });

      console.log(`Electoral vote totals: DEM=${demVotes}, REP=${repVotes}, UNCALLED=${uncalledVotes}`);
      return { demVotes, repVotes, uncalledVotes };
    };

    const senatePartyCounts = getSenatePartyCounts();
    const housePartyCounts = getHousePartyCounts();
    const electoralVotes = getElectoralVotes();

    return {
      presidential: {
        race: presidentialRace,
        demCandidate,
        repCandidate,
        statusCounts: getStatusCounts(presidentialRaces, 'Presidential'),
        electoralVotes
      },
      senate: {
        statusCounts: getStatusCounts(senateRaces, 'Senate'),
        partyCounts: senatePartyCounts
      },
      house: {
        statusCounts: getStatusCounts(houseRaces, 'House'),
        partyCounts: housePartyCounts
      },
      governor: {
        statusCounts: getStatusCounts(governorRaces, 'Governor')
      }
    };
  }, [races, bopData]);

  const PartyBox = ({ 
    count, 
    party
  }: { 
    count: number; 
    party: 'DEM' | 'REP' | 'IND' | 'UNCALLED'; 
  }) => {
    const getBoxStyle = () => {
      switch (party) {
        case 'DEM': return 'bg-blue-600 text-white';
        case 'REP': return 'bg-red-600 text-white';
        case 'IND': return 'bg-purple-600 text-white';
        case 'UNCALLED': return 'bg-gray-400 text-white';
        default: return 'bg-gray-400 text-white';
      }
    };

    return (
      <div className={`${getBoxStyle()} rounded-lg px-4 py-3 text-center flex-1`}>
        <div className="text-xl font-bold">{count}</div>
        <div className="text-sm">{party}</div>
      </div>
    );
  };

  const ControlBadge = ({ party }: { party: string }) => (['Democratic', 'Republican'].includes(party) && 
    (<div className="flex items-center gap-2">
      <span className={`text-sm font-medium text-${party === 'Republican' ? 'red' : 'blue'}-600`}>{party} Control</span>
    </div>)
  );

  const EditableAvatar = ({ 
    candidate, 
    race 
  }: { 
    candidate: Candidate; 
    race: Race;
  }) => {
    const handleImageClick = () => {
      setEditingCandidate({ candidateId: candidate.id, raceId: race.id });
    };

    const handleImageUpdate = (imageUrl: string) => {
      const updatedCandidates = race.candidates.map(c => 
        c.id === candidate.id 
          ? { ...c, headshot: imageUrl }
          : c
      );
      
      const updatedRace = { ...race, candidates: updatedCandidates };
      onUpdateRace(updatedRace);
      setEditingCandidate(null);
    };

    const candidateName = getFieldValue(candidate.name);
    const candidateParty = getFieldValue(candidate.party);
    const candidateHeadshot = getFieldValue(candidate.headshot || '');

    return (
      <>
        <div className="relative group">
          <Avatar className="w-12 h-12 cursor-pointer transition-opacity group-hover:opacity-80" onClick={handleImageClick}>
            <AvatarImage src={candidateHeadshot} alt={candidateName} />
            <AvatarFallback className="bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <img src={uploadIcon} alt="Upload" className="w-6 h-6 opacity-60" />
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-full">
            <Camera className="w-4 h-4 text-white" />
          </div>
        </div>
        
        {editingCandidate && editingCandidate.candidateId === candidate.id && (
          <EditImageDialog
            isOpen={true}
            onClose={() => setEditingCandidate(null)}
            candidate={{
              name: candidateName,
              party: candidateParty,
              imageUrl: candidateHeadshot
            }}
            onImageUpdate={handleImageUpdate}
            hasImageOverride={isFieldOverridden(candidate.headshot)}
            hasNameOverride={isFieldOverridden(candidate.name)}
            hasPartyOverride={isFieldOverridden(candidate.party)}
          />
        )}
      </>
    );
  };

  const hasPresidentialRace = summaryData.presidential.race != null;

  console.log('summaryDataaaaaa')
  console.log(summaryData)
  console.log(summaryData.presidential.demCandidate)

  return (
    <div className="space-y-6">
      {/* Presidential Election - Only show if there are presidential races */}
      {hasPresidentialRace && (
        <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            President - Electoral College
            {summaryData.presidential.race.status === 'CALLED' && (
            <Badge variant="outline" className="ml-auto bg-green-100 text-green-700 border-green-300">
              CALLED
            </Badge>
            )}
            
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {/* Left side - Kamala Harris */}
            <div className="flex items-center gap-3">
              {/*summaryData.presidential.demCandidate && summaryData.presidential.race && (
                <EditableAvatar 
                  candidate={summaryData.presidential.demCandidate}
                  race={summaryData.presidential.race}
                />
              )*/}
              {summaryData.presidential.demCandidate && summaryData.presidential.race && (
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={summaryData.presidential.demCandidate.headshot} 
                    alt={summaryData.presidential.demCandidate.name} 
                  />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <div className="font-semibold">{summaryData.presidential.demCandidate ? getFieldValue(summaryData.presidential.demCandidate.name) : 'Kamala Harris'}</div>
                <div className="text-sm text-blue-600">Democratic</div>
              </div>
            </div>

            {/* Middle - Electoral votes */}
            <div className="flex items-center gap-3 min-w-[400px]">
              <div className="bg-blue-600 text-white rounded-lg px-6 py-4 text-center flex-1">
                <div className="text-2xl font-bold">{summaryData.presidential.electoralVotes?.demVotes || 0}</div>
                <div className="text-sm">DEM</div>
              </div>
              <div className="bg-gray-400 text-white rounded-lg px-6 py-4 text-center flex-1">
                <div className="text-2xl font-bold">{summaryData.presidential.electoralVotes?.uncalledVotes || 0}</div>
                <div className="text-sm">UNCALLED</div>
              </div>
              <div className="bg-red-600 text-white rounded-lg px-6 py-4 text-center flex-1">
                <div className="text-2xl font-bold">{summaryData.presidential.electoralVotes?.repVotes || 0}</div>
                <div className="text-sm">REP</div>
              </div>
            </div>

            {/* Right side - Donald Trump */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold">{summaryData.presidential.repCandidate ? getFieldValue(summaryData.presidential.repCandidate.name) : 'Donald Trump'}</div>
                <div className="text-sm text-red-600">Republican</div>
              </div>
              {summaryData.presidential.repCandidate && summaryData.presidential.race && (
                <EditableAvatar 
                  candidate={summaryData.presidential.repCandidate}
                  race={summaryData.presidential.race}
                />
              )}
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-4">
            270 electoral votes needed to win
          </div>
        </CardContent>
      </Card>
      )}

      {/* Congressional Elections */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* U.S. Senate */}
        {(summaryData.senate.statusCounts.total > 0) && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                U.S. Senate
              </div>
              <ControlBadge party={summaryData.senate.partyCounts.demSeats >= 51 ? 'Democratic' : summaryData.senate.partyCounts.repSeats >= 51 ? 'Republican' : ''} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <PartyBox count={summaryData.senate.partyCounts.demSeats} party="DEM" />
              <PartyBox count={summaryData.senate.partyCounts.repSeats} party="REP" />
              <PartyBox count={summaryData.senate.partyCounts.indSeats} party="IND" />
              <PartyBox count={summaryData.senate.partyCounts.uncalledSeats} party="UNCALLED" />
            </div>
            <div className="text-sm text-muted-foreground">
              51 seats needed for majority
            </div>
          </CardContent>
        </Card>)}

        {/* U.S. House */}
        {(summaryData.house.statusCounts.total > 0) && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                U.S. House
              </div>
              <ControlBadge party={summaryData.house.partyCounts.demSeats >= 218 ? 'Democratic' : summaryData.house.partyCounts.repSeats >= 218 ? 'Republican' : ''} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <PartyBox count={summaryData.house.partyCounts.demSeats} party="DEM" />
              <PartyBox count={summaryData.house.partyCounts.repSeats} party="REP" />
              <PartyBox count={summaryData.house.partyCounts.indSeats} party="IND" />
              <PartyBox count={summaryData.house.partyCounts.uncalledSeats} party="UNCALLED" />
            </div>
            <div className="text-sm text-muted-foreground">
              218 seats needed for majority
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Race Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Race Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid ${hasPresidentialRace ? 'grid-cols-4' : 'grid-cols-3'} gap-6`}>
            {/* Presidential - only show if there are presidential races */}
            {hasPresidentialRace && (
              <div className="text-center space-y-2">
                <div className="font-medium text-sm">Presidential</div>
                <div className="space-y-1">
                  <div><span className="text-green-600 font-bold">{summaryData.presidential.statusCounts.called}</span> <span className="text-xs text-muted-foreground">called</span></div>
                  <div><span className="text-gray-600 font-bold">{summaryData.presidential.statusCounts.total}</span> <span className="text-xs text-muted-foreground">total</span></div>
                  <div><span className="text-blue-600 font-bold">{summaryData.presidential.statusCounts.projected}</span> <span className="text-xs text-muted-foreground">proj.</span></div>
                </div>
              </div>
            )}

            {/* Senate */}
            {summaryData.senate.statusCounts.total > 0 && (
            <div className="text-center space-y-2">
              <div className="font-medium text-sm">Senate</div>
              <div className="space-y-1">
                <div><span className="text-green-600 font-bold">{summaryData.senate.statusCounts.called}</span> <span className="text-xs text-muted-foreground">called</span></div>
                <div><span className="text-gray-600 font-bold">{summaryData.senate.statusCounts.total}</span> <span className="text-xs text-muted-foreground">total</span></div>
                <div><span className="text-blue-600 font-bold">{summaryData.senate.statusCounts.projected}</span> <span className="text-xs text-muted-foreground">proj.</span></div>
              </div>
            </div>
            )}

            {/* House */}
            {summaryData.house.statusCounts.total > 0 && (
            <div className="text-center space-y-2">
              <div className="font-medium text-sm">House</div>
              <div className="space-y-1">
                <div><span className="text-green-600 font-bold">{summaryData.house.statusCounts.called}</span> <span className="text-xs text-muted-foreground">called</span></div>
                <div><span className="text-gray-600 font-bold">{summaryData.house.statusCounts.total}</span> <span className="text-xs text-muted-foreground">total</span></div>
                <div><span className="text-blue-600 font-bold">{summaryData.house.statusCounts.projected}</span> <span className="text-xs text-muted-foreground">proj.</span></div>                
              </div>
            </div>)}

            {/* Governor */}
            {summaryData.governor.statusCounts.total > 0 && (
            <div className="text-center space-y-2">
              <div className="font-medium text-sm">Governor</div>
              <div className="space-y-1">
                <div><span className="text-green-600 font-bold">{summaryData.governor.statusCounts.called}</span> <span className="text-xs text-muted-foreground">called</span></div>
                <div><span className="text-gray-600 font-bold">{summaryData.governor.statusCounts.total}</span> <span className="text-xs text-muted-foreground">total</span></div>
                <div><span className="text-blue-600 font-bold">{summaryData.governor.statusCounts.projected}</span> <span className="text-xs text-muted-foreground">proj.</span></div>                
              </div>              
            </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}