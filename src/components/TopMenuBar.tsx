import {
  LayoutGrid,
  Wrench,
  Settings,
  HelpCircle,
  User as UserIcon,
  LogOut,
  FileText,
  MessageSquare,
  Users,
  Zap,
  Cloud,
  ImageIcon,
  Bot,
  Rss,
  Tv,
} from "lucide-react";
import { useState, useEffect } from "react";
import { AccountSettingsDialog } from "./AccountSettingsDialog";
import emergentLogo from "figma:asset/14eb232dfd8c5b46f028102fb55aac1720da01bb.png";
import { User, Role, Permission } from "../types/users";
import { SharedTopMenuBar, BrandingConfig, MenuDropdown } from "./shared/SharedTopMenuBar";
import { supabase } from "../utils/supabase/client";

interface TopMenuBarProps {
  onNavigate: (view: string) => void;
  currentUser?: User;
  roles?: Role[];
  permissions?: Permission[];
  onUpdateUser?: (updatedUser: Partial<User>) => void;
  dashboardConfig?: any[];
}

export function TopMenuBar({ 
  onNavigate, 
  currentUser, 
  roles = [], 
  permissions = [],
  onUpdateUser,
  dashboardConfig = []
}: TopMenuBarProps) {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [apps, setApps] = useState<Array<{ 
    id: string; 
    name: string; 
    app_url: string; 
    sort_order: number;
    app_key: string;
  }>>([]);

  // Fetch apps from backend
  useEffect(() => {
    const fetchApps = async () => {
      const { data, error } = await supabase.rpc("list_active_applications");
      
      if (!error && data) {
        console.log("Applications fetched from backend:", data);
        setApps(data); // dropdown items
      } else if (error) {
        console.error("Failed to fetch applications:", error);
      }
    };
    
    fetchApps();
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleUpdateUser = (updatedUser: Partial<User>) => {
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
  };
  
  // Helper function to check if a dashboard is visible
  const isDashboardVisible = (dashboardId: string) => {
    // If no config, show all dashboards (default behavior)
    if (!dashboardConfig || dashboardConfig.length === 0) {
      return true;
    }
    
    // Find the dashboard in the config
    const dashboard = dashboardConfig.find(d => d.dashboard_id === dashboardId);
    
    // If not found, hide by default
    if (!dashboard) {
      return false;
    }
    
    // Return visibility status
    return dashboard.visible;
  };

  // Branding Configuration
  const branding: BrandingConfig = {
    logoLight: emergentLogo,
    logoDark: emergentLogo,
    logoAlt: "EMERGENT",
    appIcon: (
      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-semibold text-sm">N</span>
      </div>
    ),
    appName: "Nova",
    onLogoClick: () => onNavigate('home'),
  };

  // Apps Menu Configuration
  const appsMenu: MenuDropdown | undefined = apps.length > 0 ? {
    id: 'apps',
    label: 'Apps',
    icon: LayoutGrid,
    sections: [
      {
        items: apps.map(app => ({
          id: app.id,
          label: app.name,
          onClick: () => {
            console.log('App clicked:', app.name, 'navigating to:', app.app_url);
            window.open(app.app_url, '_blank');
          },
        })),
      },
    ],
  } : undefined;

  // Tools Menu Configuration
  const toolsMenuItems = [
    { id: 'agents', label: 'Agents', icon: Bot, onClick: () => onNavigate('agents'), dashboardId: 'agents' },
    { id: 'feeds', label: 'Data Feeds', icon: Rss, onClick: () => onNavigate('feeds'), dashboardId: null },
    { id: 'media', label: 'Media Library', icon: ImageIcon, onClick: () => onNavigate('media'), dashboardId: 'media_library' },
    { id: 'channels', label: 'Channels', icon: Tv, onClick: () => onNavigate('channels'), dashboardId: null },
  ];
  
  const toolsMenu: MenuDropdown = {
    id: 'tools',
    label: 'Tools',
    icon: Wrench,
    sections: [
      {
        items: toolsMenuItems.filter(item => {
          // Always show items that don't have a dashboard association
          if (!item.dashboardId) {
            return true;
          }
          // Filter based on dashboard visibility
          return isDashboardVisible(item.dashboardId);
        }),
      },
    ],
  };

  // Settings Menu Configuration
  const settingsMenu: MenuDropdown = {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    sections: [
      {
        label: 'Preferences',
        items: [
          { id: 'dark-mode-toggle', label: 'Dark Mode' }, // Special ID for dark mode
        ],
      },
      {
        items: [
          { 
            id: 'account-settings', 
            label: 'Account Settings', 
            icon: UserIcon,
            onClick: () => setShowAccountSettings(true) 
          },
          { 
            id: 'users-groups', 
            label: 'Users and Groups', 
            icon: Users,
            onClick: () => onNavigate('users-groups') 
          },
          { 
            id: 'dashboard-prefs', 
            label: 'Dashboard Preferences', 
            icon: Settings,
            disabled: true 
          },
          { 
            id: 'ai-connections', 
            label: 'AI Connections', 
            icon: Zap,
            onClick: () => onNavigate('ai-connections') 
          },
        ],
      },
      {
        items: [
          { 
            id: 'sign-out', 
            label: 'Sign Out', 
            icon: LogOut,
            variant: 'destructive' as const 
          },
        ],
      },
    ],
  };

  // Help Menu Configuration
  const helpMenu: MenuDropdown = {
    id: 'help',
    label: 'Help',
    icon: HelpCircle,
    sections: [
      {
        label: 'Support',
        items: [
          { id: 'docs', label: 'Documentation', icon: FileText, disabled: true },
          { id: 'support', label: 'Contact Support', icon: MessageSquare, disabled: true },
        ],
      },
      {
        items: [
          { id: 'whats-new', label: "What's New", icon: HelpCircle, disabled: true },
          { id: 'status', label: 'Status Page', icon: HelpCircle, disabled: true },
        ],
      },
    ],
  };

  return (
    <SharedTopMenuBar
      branding={branding}
      menus={{
        apps: appsMenu,
        tools: toolsMenu,
        settings: settingsMenu,
        help: helpMenu,
      }}
      darkMode={darkMode}
      onDarkModeToggle={toggleDarkMode}
      accountSettingsDialog={
        currentUser ? (
          <AccountSettingsDialog
            open={showAccountSettings}
            onOpenChange={setShowAccountSettings}
            currentUser={currentUser}
            roles={roles}
            permissions={permissions}
            onSave={handleUpdateUser}
          />
        ) : undefined
      }
    />
  );
}