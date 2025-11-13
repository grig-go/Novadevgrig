import React from 'react';
import { Card, CardContent } from './ui/card';
import { LucideIcon } from 'lucide-react';

interface DashboardCardData {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  stats: Array<{
    label: string;
    value: string | number | React.ReactNode;
    isComponent?: boolean;
  }>;
  onClick: () => void;
}

interface DashboardConfig {
  dashboard_id: string;
  visible: boolean;
  order_index: number;
}

interface DashboardCardRendererProps {
  dashboards: DashboardConfig[];
  cardDataMap: Record<string, DashboardCardData>;
}

export const DashboardCardRenderer: React.FC<DashboardCardRendererProps> = ({
  dashboards,
  cardDataMap,
}) => {
  // Filter visible dashboards and sort by order_index
  const visibleDashboards = dashboards
    .filter(d => d.visible)
    .sort((a, b) => a.order_index - b.order_index)
    .map(d => cardDataMap[d.dashboard_id])
    .filter(Boolean); // Remove any undefined entries

  // Calculate dynamic card height based on number of cards
  const cardCount = visibleDashboards.length;
  const getCardHeight = () => {
    if (cardCount === 1) return 'min-h-[507px]'; // 60% larger
    if (cardCount >= 2 && cardCount <= 3) return 'min-h-[476px]'; // 50% larger
    return 'min-h-[317px]'; // default size for 4+ cards
  };

  // Get column start position for centering incomplete rows
  const getColStartClass = (index: number) => {
    // For 2 cards: grid is 6 columns, each card spans 2
    // Card 0: starts at column 2 (offset by 1 card width to center 2 cards)
    if (cardCount === 2) {
      if (index === 0) return 'md:col-start-2 md:col-span-2';
      return 'md:col-span-2';
    }
    
    // For 5 cards (3 top, 2 bottom): grid is 6 columns, each card spans 2
    // Cards 0-2 (first row): col-span-2 each
    // Card 3 (first of second row): should start at column 2 (offset by 1 card width to center 2 cards)
    if (cardCount === 5 && index === 3) {
      return 'md:col-start-2 md:col-span-2';
    }
    if (cardCount === 5) {
      return 'md:col-span-2';
    }
    
    // For 7 cards (4 top, 3 bottom): grid is 8 columns, ALL cards span 2
    // Cards 0-3 (first row): each card spans 2 columns = 8 total (perfect fit)
    // Cards 4-6 (second row): each card spans 2 columns = 6 total (need to center in 8 columns)
    // Card 4 (first of second row): start at column 2 to center 3 cards (2+2+2 = 6 columns, with 1 column padding on each side)
    if (cardCount === 7) {
      if (index === 4) return 'lg:col-start-2 lg:col-span-2';
      return 'lg:col-span-2';
    }
    
    return '';
  };

  return (
    <>
      {visibleDashboards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            className={`group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border ${getCardHeight()} ${getColStartClass(index)}`}
            onClick={card.onClick}
          >
            <CardContent className="p-6 h-full flex flex-col">
              {/* Icon and Title Section */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <h3 className="font-semibold text-[20px]">{card.title}</h3>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-6 line-clamp-3 flex-grow">
                {card.description}
              </p>

              {/* Separator Line */}
              <div className="border-t mb-4 mt-auto"></div>

              {/* Stats Section - All on one line */}
              <div className="flex items-center gap-3 flex-wrap text-sm">
                {card.stats.map((stat, idx) => (
                  <div key={idx} className="flex items-baseline gap-1.5">
                    {stat.isComponent ? (
                      stat.value
                    ) : (
                      <>
                        <span className="font-medium text-foreground">{stat.value}</span>
                        {stat.label && (
                          <span className="text-muted-foreground whitespace-nowrap">
                            {stat.label}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};