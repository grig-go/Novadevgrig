/**
 * SharedTopMenuBar Component
 * 
 * @version 1.0.0
 * @lastUpdated 2025-10-14
 * @author Nova Dashboard Team
 * @description A reusable top menu bar component for multiple projects
 * 
 * CHANGELOG:
 * - 1.0.0 (2025-10-14): Initial release with full menu configuration support
 */

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import {
  LayoutGrid,
  Wrench,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  User as UserIcon,
  LogOut,
  LucideIcon,
} from "lucide-react";
import { useState, ReactNode } from "react";
import emergentLogo from "figma:asset/14eb232dfd8c5b46f028102fb55aac1720da01bb.png";

/**
 * Component version - increment when making breaking changes
 */
export const SHARED_TOP_MENU_BAR_VERSION = "1.0.0";

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
}

export interface MenuSection {
  label?: string;
  items: MenuItem[];
}

export interface MenuDropdown {
  id: string;
  label: string;
  icon: LucideIcon;
  sections: MenuSection[];
}

export interface BrandingConfig {
  logoLight: string;
  logoDark: string;
  logoAlt: string;
  appIcon: ReactNode;
  appName: string;
  onLogoClick: () => void;
}

export interface SharedTopMenuBarProps {
  branding: BrandingConfig;
  menus: {
    apps?: MenuDropdown;
    tools?: MenuDropdown;
    settings?: MenuDropdown;
    help?: MenuDropdown;
  };
  darkMode?: boolean;
  onDarkModeToggle?: () => void;
  accountSettingsDialog?: ReactNode;
  customMenus?: MenuDropdown[];
}

export function SharedTopMenuBar({
  branding,
  menus,
  darkMode: externalDarkMode,
  onDarkModeToggle,
  accountSettingsDialog,
  customMenus = [],
}: SharedTopMenuBarProps) {
  const [internalDarkMode, setInternalDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Use external dark mode if provided, otherwise use internal
  const darkMode = externalDarkMode !== undefined ? externalDarkMode : internalDarkMode;

  const handleDarkModeToggle = () => {
    if (onDarkModeToggle) {
      onDarkModeToggle();
    } else {
      setInternalDarkMode(!internalDarkMode);
      document.documentElement.classList.toggle('dark');
    }
  };

  const renderMenuDropdown = (dropdown: MenuDropdown) => (
    <DropdownMenu key={dropdown.id}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <dropdown.icon className="w-4 h-4" />
          {dropdown.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {dropdown.sections.map((section, sectionIndex) => (
          <div key={`section-${sectionIndex}`}>
            {section.label && <DropdownMenuLabel>{section.label}</DropdownMenuLabel>}
            {section.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`gap-2 ${item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                    item.variant === 'destructive' ? 'text-destructive' : ''
                  }`}
                >
                  {ItemIcon && <ItemIcon className="w-4 h-4" />}
                  {item.label}
                </DropdownMenuItem>
              );
            })}
            {sectionIndex < dropdown.sections.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="sticky top-0 z-50 border-b bg-card shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={branding.onLogoClick}
          >
            <img 
              src={emergentLogo} 
              alt={branding.logoAlt} 
              className={`h-6 ${darkMode ? 'invert' : ''}`}
            />
            {branding.appIcon}
            <span className="font-semibold text-lg">{branding.appName}</span>
          </div>

          {/* Menu Items */}
          <div className="flex items-center gap-2">
            {/* Apps Dropdown */}
            {menus.apps && renderMenuDropdown(menus.apps)}

            {/* Tools Dropdown */}
            {menus.tools && renderMenuDropdown(menus.tools)}

            {/* Settings Dropdown - Special handling for dark mode */}
            {menus.settings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <menus.settings.icon className="w-4 h-4" />
                    {menus.settings.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {menus.settings.sections.map((section, sectionIndex) => (
                    <div key={`section-${sectionIndex}`}>
                      {section.label && <DropdownMenuLabel>{section.label}</DropdownMenuLabel>}
                      {section.items.map((item) => {
                        // Special handling for dark mode toggle
                        if (item.id === 'dark-mode-toggle') {
                          return (
                            <DropdownMenuItem 
                              key={item.id}
                              onClick={handleDarkModeToggle} 
                              className="gap-2 cursor-pointer"
                            >
                              {darkMode ? (
                                <>
                                  <Sun className="w-4 h-4" />
                                  Light Mode
                                </>
                              ) : (
                                <>
                                  <Moon className="w-4 h-4" />
                                  Dark Mode
                                </>
                              )}
                            </DropdownMenuItem>
                          );
                        }

                        const ItemIcon = item.icon;
                        return (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={item.onClick}
                            disabled={item.disabled}
                            className={`gap-2 ${item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                              item.variant === 'destructive' ? 'text-destructive' : ''
                            }`}
                          >
                            {ItemIcon && <ItemIcon className="w-4 h-4" />}
                            {item.label}
                          </DropdownMenuItem>
                        );
                      })}
                      {sectionIndex < menus.settings.sections.length - 1 && <DropdownMenuSeparator />}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Help Dropdown */}
            {menus.help && renderMenuDropdown(menus.help)}

            {/* Custom Menus */}
            {customMenus.map((menu) => renderMenuDropdown(menu))}
          </div>
        </div>
      </div>

      {/* Custom Content (e.g., Account Settings Dialog) */}
      {accountSettingsDialog}
    </div>
  );
}
