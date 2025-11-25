import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { GameDetailsWithLineups } from "./GameDetailsWithLineups";
import { TeamStatsModal } from "./TeamStatsModal";

interface GameCardProps {
  game: {
    id: string;
    start_time: string;
    status: string;
    home_score?: number;
    away_score?: number;
    round?: string;
    venue_name?: string;
    venue_city?: string;
    attendance?: number;
    home_team: {
      id: string;
      name: string;
      short_name?: string;
      logo_url?: string;
      colors?: {
        primary?: string;
        secondary?: string;
      };
    };
    away_team: {
      id: string;
      name: string;
      short_name?: string;
      logo_url?: string;
      colors?: {
        primary?: string;
        secondary?: string;
      };
    };
    league?: {
      id: string;
      name: string;
      logo_url?: string;
    };
  };
  onClick?: () => void;
}

// Helper function to format date/time
const formatGameDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const gameDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  let dayLabel = '';
  if (gameDate.getTime() === today.getTime()) {
    dayLabel = 'Today';
  } else if (gameDate.getTime() === tomorrow.getTime()) {
    dayLabel = 'Tomorrow';
  } else {
    dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  return `${dayLabel} • ${time}`;
};

// Helper function to get status badge
const getStatusBadge = (status: string) => {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'live' || statusLower === 'inprogress' || statusLower === 'in_progress') {
    return (
      <Badge className="bg-red-500 text-white border-0 animate-pulse">
        <span className="mr-1">🔴</span> LIVE
      </Badge>
    );
  }
  
  if (statusLower === 'ended' || statusLower === 'closed' || statusLower === 'complete') {
    return (
      <Badge variant="secondary">
        Full Time
      </Badge>
    );
  }
  
  if (statusLower === 'scheduled' || statusLower === 'not_started') {
    return (
      <Badge className="bg-blue-500 text-white border-0">
        Upcoming
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline">
      {status}
    </Badge>
  );
};

// Helper function to get border color based on status
const getBorderColor = (status: string): string => {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'live' || statusLower === 'inprogress' || statusLower === 'in_progress') {
    return '#ef4444'; // red
  }
  
  if (statusLower === 'scheduled' || statusLower === 'not_started') {
    return '#3b82f6'; // blue
  }
  
  return '#e5e7eb'; // gray
};

// Helper function to check if game is ended
const isGameEnded = (status: string): boolean => {
  const statusLower = status.toLowerCase();
  return statusLower === 'ended' || statusLower === 'closed' || statusLower === 'complete';
};

export function GameCard({ game, onClick }: GameCardProps) {
  const ended = isGameEnded(game.status);
  const borderColor = getBorderColor(game.status);
  
  const [showDetails, setShowDetails] = useState(false);
  const [showTeamStats, setShowTeamStats] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const handleTeamClick = (e: React.MouseEvent, teamId: string) => {
    e.stopPropagation(); // Prevent card click
    e.preventDefault();
    console.log('Team clicked:', teamId);
    setSelectedTeamId(teamId);
    setShowTeamStats(true);
  };

  const handleBackgroundClick = () => {
    console.log('Card background clicked');
    if (onClick) {
      onClick();
    } else {
      setShowDetails(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer ${ended ? 'bg-muted/30' : ''}`}
          style={{
            borderLeft: `4px solid ${borderColor}`
          }}
          onClick={handleBackgroundClick}
        >
          <CardContent className="p-4">
            {/* Header: League + Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {game.league?.logo_url && (
                  <img
                    src={game.league.logo_url}
                    alt={game.league.name}
                    className="w-6 h-6 object-contain"
                  />
                )}
                <span className="text-sm text-muted-foreground truncate">
                  {game.league?.name || 'League'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {game.round && (
                  <Badge variant="outline" className="text-xs">
                    {game.round}
                  </Badge>
                )}
                {getStatusBadge(game.status)}
              </div>
            </div>

            {/* Match Content */}
            <div className="space-y-3">
              {/* Home Team */}
              <div className="flex items-center justify-between">
                <button 
                  type="button"
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-all hover:scale-[1.02] relative z-10 border-0 bg-transparent text-left"
                  onClick={(e) => handleTeamClick(e, game.home_team.id)}
                  onMouseDown={(e) => {
                    console.log('Home team mouse down');
                  }}
                  title="Click to view team stats"
                >
                  {game.home_team.logo_url ? (
                    <img
                      src={game.home_team.logo_url}
                      alt={game.home_team.name}
                      className="w-10 h-10 object-contain flex-shrink-0 pointer-events-none"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0 pointer-events-none">
                      <span className="text-xs">{game.home_team.short_name?.[0] || 'H'}</span>
                    </div>
                  )}
                  <span className="font-medium truncate pointer-events-none">
                    {game.home_team.short_name || game.home_team.name}
                  </span>
                </button>
                {ended && (
                  <span className="text-2xl font-bold ml-3">
                    {game.home_score ?? 0}
                  </span>
                )}
              </div>

              {/* Divider / VS */}
              <div className="flex items-center justify-center py-1">
                {ended ? (
                  <div className="w-full h-px bg-border" />
                ) : (
                  <span className="text-sm text-muted-foreground">vs</span>
                )}
              </div>

              {/* Away Team */}
              <div className="flex items-center justify-between">
                <button 
                  type="button"
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-all hover:scale-[1.02] relative z-10 border-0 bg-transparent text-left"
                  onClick={(e) => handleTeamClick(e, game.away_team.id)}
                  onMouseDown={(e) => {
                    console.log('Away team mouse down');
                  }}
                  title="Click to view team stats"
                >
                  {game.away_team.logo_url ? (
                    <img
                      src={game.away_team.logo_url}
                      alt={game.away_team.name}
                      className="w-10 h-10 object-contain flex-shrink-0 pointer-events-none"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0 pointer-events-none">
                      <span className="text-xs">{game.away_team.short_name?.[0] || 'A'}</span>
                    </div>
                  )}
                  <span className="font-medium truncate pointer-events-none">
                    {game.away_team.short_name || game.away_team.name}
                  </span>
                </button>
                {ended && (
                  <span className="text-2xl font-bold ml-3">
                    {game.away_score ?? 0}
                  </span>
                )}
              </div>
            </div>

            {/* Match Details */}
            <div className="mt-4 pt-4 border-t space-y-2">
              {/* Date/Time */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{formatGameDateTime(game.start_time)}</span>
              </div>

              {/* Venue */}
              {game.venue_name && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">
                    {game.venue_name}
                    {game.venue_city && `, ${game.venue_city}`}
                  </span>
                </div>
              )}

              {/* Attendance */}
              {game.attendance && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{game.attendance.toLocaleString()} attendance</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <GameDetailsWithLineups 
        gameId={game.id}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
      
      <TeamStatsModal 
        teamId={selectedTeamId}
        open={showTeamStats}
        onOpenChange={setShowTeamStats}
      />
    </>
  );
}