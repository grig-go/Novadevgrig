import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { User, Group, Role, Permission } from "../types/users";
import {
  Users,
  UserPlus,
  UsersRound,
  Shield,
  Search,
  Filter,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Mail,
  Calendar,
  Eye,
  Edit,
  Trash2,
  UserCog,
  KeyRound,
  Camera,
  Upload,
  Link as LinkIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UsersGroupsPageProps {
  users: User[];
  groups: Group[];
  roles: Role[];
  permissions: Permission[];
  lastUpdated: string;
}

export function UsersGroupsPage({
  users,
  groups,
  roles,
  permissions,
  lastUpdated
}: UsersGroupsPageProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'roles'>('users');
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<User | null>(null);
  const [showNewUserAvatarPicker, setShowNewUserAvatarPicker] = useState(false);
  const [isNewGroupDialogOpen, setIsNewGroupDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState<Group | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Avatar options - extract from existing users plus some extras
  const avatarOptions = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer",
  ];

  // Color options for groups
  const colorOptions = [
    "#FF6B6B", "#4ECDC4", "#95E1D3", "#F38181",
    "#A8E6CF", "#FFD93D", "#6C5CE7", "#FD79A8",
    "#74B9FF", "#A29BFE", "#FD9644", "#55EFC4",
    "#81ECEC", "#FDCB6E", "#E17055", "#00B894"
  ];

  // Helper functions
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusIcon = (status: User['status']) => {
    switch (status) {
      case 'Active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Pending':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'Inactive':
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: User['status']) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Inactive':
        return 'outline';
    }
  };

  const getDaysSinceLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return null;
    const days = Math.floor(
      (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const getDaysSinceCreated = (createdAt: string) => {
    const days = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const getQuickActionBadge = (user: User) => {
    const daysSinceCreated = getDaysSinceCreated(user.created_at);
    const daysSinceLogin = getDaysSinceLastLogin(user.last_login);

    if (daysSinceCreated <= 7) {
      return (
        <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
          <Sparkles className="w-3 h-3" />
          New this week
        </Badge>
      );
    }

    if (daysSinceLogin !== null && daysSinceLogin >= 30) {
      return (
        <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
          <AlertCircle className="w-3 h-3" />
          Inactive 30+ days
        </Badge>
      );
    }

    return null;
  };

  const getUserGroups = (user: User) => {
    return user.groups.map(groupId => groups.find(g => g.id === groupId)).filter(Boolean) as Group[];
  };

  const getGroupMembers = (group: Group) => {
    return group.members.map(userId => users.find(u => u.id === userId)).filter(Boolean) as User[];
  };

  const getPermissionDetails = (permissionKey: string) => {
    return permissions.find(p => p.key === permissionKey);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.full_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Group filter
    if (groupFilter !== 'all') {
      filtered = filtered.filter(user => user.groups.includes(groupFilter));
    }

    // Unassigned filter
    if (showUnassigned) {
      filtered = filtered.filter(user => user.groups.length === 0);
    }

    return filtered;
  }, [users, searchQuery, statusFilter, roleFilter, groupFilter, showUnassigned]);

  // AI Grouping Suggestions
  const aiGroupingSuggestions = useMemo(() => {
    const suggestions = [];
    
    // Find users with similar activity patterns
    const inactiveUsers = users.filter(u => {
      const days = getDaysSinceLastLogin(u.last_login);
      return days !== null && days >= 30;
    });
    
    if (inactiveUsers.length >= 2) {
      suggestions.push({
        id: 'inactive-users',
        name: 'Inactive Users',
        description: 'Users who haven\'t logged in for 30+ days',
        color: '#FFA07A',
        members: inactiveUsers.map(u => u.id),
        reasoning: 'Similar inactivity pattern detected'
      });
    }

    // Find new users
    const newUsers = users.filter(u => getDaysSinceCreated(u.created_at) <= 30);
    if (newUsers.length >= 2) {
      suggestions.push({
        id: 'new-users',
        name: 'New Members',
        description: 'Recently joined users (last 30 days)',
        color: '#87CEEB',
        members: newUsers.map(u => u.id),
        reasoning: 'Onboarding cohort - joined within 30 days'
      });
    }

    // Find users without groups
    const unassignedUsers = users.filter(u => u.groups.length === 0);
    if (unassignedUsers.length >= 2) {
      suggestions.push({
        id: 'unassigned-users',
        name: 'Unassigned Users',
        description: 'Users not in any group',
        color: '#D3D3D3',
        members: unassignedUsers.map(u => u.id),
        reasoning: 'No group membership - may need assignment'
      });
    }

    return suggestions;
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Users & Groups
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts, group memberships, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" disabled>
            <UserCog className="w-4 h-4" />
            Bulk Edit
          </Button>
          <Dialog open={isNewGroupDialogOpen} onOpenChange={(open) => {
            setIsNewGroupDialogOpen(open);
            if (!open) {
              setNewGroup(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => {
                  // Initialize new group with default values
                  const defaultNewGroup: Group = {
                    id: `grp_${Date.now()}`,
                    name: "",
                    description: "",
                    color: colorOptions[0],
                    members: [],
                    permissions: ["read"],
                    created_at: new Date().toISOString()
                  };
                  setNewGroup(defaultNewGroup);
                  setIsNewGroupDialogOpen(true);
                }}
              >
                <UsersRound className="w-4 h-4" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              {newGroup && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div className="relative">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: newGroup.color }}
                        >
                          <UsersRound className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Group Name"
                          value={newGroup.name}
                          onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                          className="font-medium"
                        />
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 mt-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        placeholder="Describe the purpose and responsibilities of this group..."
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Group Color</label>
                      <div className="grid grid-cols-8 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewGroup({ ...newGroup, color })}
                            className="relative w-10 h-10 rounded-full hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                          >
                            {newGroup.color === color && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-white drop-shadow-md" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Members */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Members</label>
                      <div className="flex flex-wrap gap-2">
                        {newGroup.members.map(userId => {
                          const user = users.find(u => u.id === userId);
                          if (!user) return null;
                          return (
                            <Badge
                              key={user.id}
                              variant="secondary"
                              className="gap-2 pr-1"
                            >
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={user.avatar} alt={user.full_name} />
                                <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                              </Avatar>
                              {user.full_name}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => setNewGroup({
                                  ...newGroup,
                                  members: newGroup.members.filter(uId => uId !== userId)
                                })}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </Badge>
                          );
                        })}
                        <Select
                          value=""
                          onValueChange={(userId) => {
                            if (!newGroup.members.includes(userId)) {
                              setNewGroup({
                                ...newGroup,
                                members: [...newGroup.members, userId]
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="w-auto h-8 gap-1">
                            <SelectValue placeholder="+ Add Member" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.filter(u => !newGroup.members.includes(u.id)).map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={user.avatar} alt={user.full_name} />
                                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                                  </Avatar>
                                  {user.full_name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Permissions</label>
                      <div className="space-y-2 border rounded-lg p-4">
                        {permissions.map(perm => (
                          <div key={perm.key} className="flex items-start gap-3">
                            <Checkbox
                              id={`perm-${perm.key}`}
                              checked={newGroup.permissions.includes(perm.key) || newGroup.permissions.includes("*")}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewGroup({
                                    ...newGroup,
                                    permissions: [...newGroup.permissions.filter(p => p !== "*"), perm.key]
                                  });
                                } else {
                                  setNewGroup({
                                    ...newGroup,
                                    permissions: newGroup.permissions.filter(p => p !== perm.key)
                                  });
                                }
                              }}
                              disabled={newGroup.permissions.includes("*")}
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`perm-${perm.key}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {perm.label}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {perm.description}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-start gap-3 pt-2 border-t">
                          <Checkbox
                            id="perm-all"
                            checked={newGroup.permissions.includes("*")}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewGroup({
                                  ...newGroup,
                                  permissions: ["*"]
                                });
                              } else {
                                setNewGroup({
                                  ...newGroup,
                                  permissions: ["read"]
                                });
                              }
                            }}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor="perm-all"
                              className="text-sm font-medium cursor-pointer"
                            >
                              Full Access (All Permissions)
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Grant all current and future permissions
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button 
                        variant="default" 
                        className="gap-2"
                        onClick={() => {
                          // Handle save logic here
                          console.log('Creating new group:', newGroup);
                          setIsNewGroupDialogOpen(false);
                          setNewGroup(null);
                        }}
                        disabled={!newGroup.name || newGroup.permissions.length === 0}
                      >
                        Create Group
                      </Button>
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => {
                          setIsNewGroupDialogOpen(false);
                          setNewGroup(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={isNewUserDialogOpen} onOpenChange={(open) => {
            setIsNewUserDialogOpen(open);
            if (!open) {
              setNewUser(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className="gap-2"
                onClick={() => {
                  // Initialize new user with default values
                  const defaultNewUser: User = {
                    id: `usr_${Date.now()}`,
                    avatar: avatarOptions[0],
                    full_name: "",
                    email: "",
                    role: "Viewer",
                    status: "Pending",
                    last_login: null,
                    groups: [],
                    permissions: ["read"],
                    created_at: new Date().toISOString()
                  };
                  setNewUser(defaultNewUser);
                  setIsNewUserDialogOpen(true);
                }}
              >
                <UserPlus className="w-4 h-4" />
                New User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              {newUser && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <Popover open={showNewUserAvatarPicker} onOpenChange={setShowNewUserAvatarPicker}>
                        <PopoverTrigger asChild>
                          <div className="relative cursor-pointer group">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={newUser.avatar} alt={newUser.full_name || "New User"} />
                              <AvatarFallback>{newUser.full_name ? getInitials(newUser.full_name) : "NU"}</AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Choose Avatar</h4>
                              <div className="grid grid-cols-6 gap-2">
                                {avatarOptions.map((avatarUrl, index) => (
                                  <button
                                    key={index}
                                    onClick={() => {
                                      setNewUser({ ...newUser, avatar: avatarUrl });
                                      setShowNewUserAvatarPicker(false);
                                    }}
                                    className="relative group/avatar"
                                  >
                                    <Avatar className="w-10 h-10 hover:ring-2 hover:ring-primary transition-all">
                                      <AvatarImage src={avatarUrl} />
                                      <AvatarFallback>?</AvatarFallback>
                                    </Avatar>
                                    {newUser.avatar === avatarUrl && (
                                      <div className="absolute inset-0 bg-primary/20 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4 text-primary" />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                              <label className="text-sm font-medium">Or enter URL</label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="https://example.com/avatar.jpg"
                                  value={newUser.avatar}
                                  onChange={(e) => setNewUser({ ...newUser, avatar: e.target.value })}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowNewUserAvatarPicker(false)}
                                >
                                  <LinkIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Full Name"
                          value={newUser.full_name}
                          onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                          className="font-medium"
                        />
                        <Input
                          placeholder="email@example.com"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          className="text-sm text-muted-foreground"
                        />
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 mt-4">
                    {/* Role Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role</label>
                      <Select 
                        value={newUser.role}
                        onValueChange={(value) => {
                          // Update role and permissions based on role
                          const selectedRole = roles.find(r => r.name === value);
                          setNewUser({ 
                            ...newUser, 
                            role: value,
                            permissions: selectedRole?.permissions || ["read"]
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(role => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Groups */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Groups</label>
                      <div className="flex flex-wrap gap-2">
                        {newUser.groups.map(groupId => {
                          const group = groups.find(g => g.id === groupId);
                          if (!group) return null;
                          return (
                            <Badge
                              key={group.id}
                              variant="secondary"
                              className="gap-2 pr-1"
                              style={{ 
                                backgroundColor: `${group.color}20`,
                                borderColor: group.color,
                                color: group.color
                              }}
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              {group.name}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => setNewUser({
                                  ...newUser,
                                  groups: newUser.groups.filter(gId => gId !== groupId)
                                })}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </Badge>
                          );
                        })}
                        <Select
                          value=""
                          onValueChange={(groupId) => {
                            if (!newUser.groups.includes(groupId)) {
                              setNewUser({
                                ...newUser,
                                groups: [...newUser.groups, groupId]
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="w-auto h-8 gap-1">
                            <SelectValue placeholder="+ Add to Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.filter(g => !newUser.groups.includes(g.id)).map(group => (
                              <SelectItem key={group.id} value={group.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: group.color }}
                                  />
                                  {group.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Permissions (based on role)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {newUser.permissions.map(perm => {
                          const permDetails = getPermissionDetails(perm);
                          return (
                            <div
                              key={perm}
                              className="flex items-start gap-2 p-3 border rounded-lg"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium">
                                  {permDetails?.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {permDetails?.description}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select 
                        value={newUser.status}
                        onValueChange={(value: User['status']) => setNewUser({ ...newUser, status: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button 
                        variant="default" 
                        className="gap-2"
                        onClick={() => {
                          // Handle save logic here
                          console.log('Creating new user:', newUser);
                          setIsNewUserDialogOpen(false);
                          setNewUser(null);
                        }}
                        disabled={!newUser.full_name || !newUser.email}
                      >
                        Create User
                      </Button>
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => {
                          setIsNewUserDialogOpen(false);
                          setNewUser(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <UsersRound className="w-4 h-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="w-4 h-4" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-5 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  variant={showUnassigned ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowUnassigned(!showUnassigned)}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Users not in any group ({users.filter(u => u.groups.length === 0).length})
                </Button>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          {aiGroupingSuggestions.length > 0 && (
            <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  AI Group Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aiGroupingSuggestions.map(suggestion => (
                    <div
                      key={suggestion.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: suggestion.color }}
                        />
                        <div>
                          <div className="font-medium">{suggestion.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {suggestion.members.length} users • {suggestion.reasoning}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Create Group
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px] pl-14">User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const userGroups = getUserGroups(user);
                    const quickBadge = getQuickActionBadge(user);
                    
                    return (
                      <TableRow key={user.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar} alt={user.full_name} />
                              <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.full_name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(user.status)}
                            <Badge variant={getStatusBadgeVariant(user.status)}>
                              {user.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {userGroups.length > 0 ? (
                              userGroups.map(group => (
                                <Badge
                                  key={group.id}
                                  variant="secondary"
                                  className="gap-1"
                                  style={{ 
                                    backgroundColor: `${group.color}20`,
                                    borderColor: group.color,
                                    color: group.color
                                  }}
                                >
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: group.color }}
                                  />
                                  {group.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">No groups</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex items-center gap-1 flex-wrap">
                              {user.permissions.slice(0, 2).map(perm => {
                                const permDetails = getPermissionDetails(perm);
                                return (
                                  <Tooltip key={perm}>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="cursor-help">
                                        {permDetails?.label || perm}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="font-medium">{permDetails?.label}</p>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {permDetails?.description}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                              {user.permissions.length > 2 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="cursor-help">
                                      +{user.permissions.length - 2}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1">
                                      {user.permissions.slice(2).map(perm => {
                                        const permDetails = getPermissionDetails(perm);
                                        return (
                                          <div key={perm}>
                                            <p className="font-medium">{permDetails?.label}</p>
                                            <p className="text-sm text-muted-foreground">
                                              {permDetails?.description}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {user.last_login ? (
                              <>
                                <div className="text-sm">
                                  {formatDistanceToNow(new Date(user.last_login), { addSuffix: true })}
                                </div>
                                {quickBadge}
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Never</span>
                                {quickBadge}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                              setIsDialogOpen(open);
                              if (!open) {
                                setSelectedUser(null);
                                setEditedUser(null);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setEditedUser(user);
                                    setIsDialogOpen(true);
                                  }}
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              {editedUser && (
                                <>
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3">
                                      <Popover open={showAvatarPicker} onOpenChange={setShowAvatarPicker}>
                                        <PopoverTrigger asChild>
                                          <div className="relative cursor-pointer group">
                                            <Avatar className="w-12 h-12">
                                              <AvatarImage src={editedUser.avatar} alt={editedUser.full_name} />
                                              <AvatarFallback>{getInitials(editedUser.full_name)}</AvatarFallback>
                                            </Avatar>
                                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Camera className="w-5 h-5 text-white" />
                                            </div>
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80" align="start">
                                          <div className="space-y-4">
                                            <div>
                                              <h4 className="font-medium mb-2">Choose Avatar</h4>
                                              <div className="grid grid-cols-6 gap-2">
                                                {avatarOptions.map((avatarUrl, index) => (
                                                  <button
                                                    key={index}
                                                    onClick={() => {
                                                      setEditedUser({ ...editedUser, avatar: avatarUrl });
                                                      setShowAvatarPicker(false);
                                                    }}
                                                    className="relative group/avatar"
                                                  >
                                                    <Avatar className="w-10 h-10 hover:ring-2 hover:ring-primary transition-all">
                                                      <AvatarImage src={avatarUrl} />
                                                      <AvatarFallback>?</AvatarFallback>
                                                    </Avatar>
                                                    {editedUser.avatar === avatarUrl && (
                                                      <div className="absolute inset-0 bg-primary/20 rounded-full flex items-center justify-center">
                                                        <CheckCircle className="w-4 h-4 text-primary" />
                                                      </div>
                                                    )}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                            <div className="space-y-2 pt-2 border-t">
                                              <label className="text-sm font-medium">Or enter URL</label>
                                              <div className="flex gap-2">
                                                <Input
                                                  placeholder="https://example.com/avatar.jpg"
                                                  value={editedUser.avatar}
                                                  onChange={(e) => setEditedUser({ ...editedUser, avatar: e.target.value })}
                                                />
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => setShowAvatarPicker(false)}
                                                >
                                                  <LinkIcon className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      <div className="flex-1 space-y-2">
                                        <Input
                                          value={editedUser.full_name}
                                          onChange={(e) => setEditedUser({ ...editedUser, full_name: e.target.value })}
                                          className="font-medium"
                                        />
                                        <Input
                                          value={editedUser.email}
                                          onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                                          className="text-sm text-muted-foreground"
                                        />
                                      </div>
                                    </DialogTitle>
                                  </DialogHeader>
                                  
                                  <div className="space-y-6 mt-4">
                                    {/* Role Selection */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Role</label>
                                      <Select 
                                        value={editedUser.role}
                                        onValueChange={(value) => setEditedUser({ ...editedUser, role: value })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {roles.map(role => (
                                            <SelectItem key={role.id} value={role.name}>
                                              {role.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Groups */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Groups</label>
                                      <div className="flex flex-wrap gap-2">
                                        {editedUser.groups.map(groupId => {
                                          const group = groups.find(g => g.id === groupId);
                                          if (!group) return null;
                                          return (
                                            <Badge
                                              key={group.id}
                                              variant="secondary"
                                              className="gap-2 pr-1"
                                              style={{ 
                                                backgroundColor: `${group.color}20`,
                                                borderColor: group.color,
                                                color: group.color
                                              }}
                                            >
                                              <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: group.color }}
                                              />
                                              {group.name}
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-4 w-4 p-0 hover:bg-transparent"
                                                onClick={() => setEditedUser({
                                                  ...editedUser,
                                                  groups: editedUser.groups.filter(gId => gId !== groupId)
                                                })}
                                              >
                                                <XCircle className="w-3 h-3" />
                                              </Button>
                                            </Badge>
                                          );
                                        })}
                                        <Button variant="outline" size="sm">
                                          + Add to Group
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Permissions */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Permissions</label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {editedUser.permissions.map(perm => {
                                          const permDetails = getPermissionDetails(perm);
                                          return (
                                            <div
                                              key={perm}
                                              className="flex items-start gap-2 p-3 border rounded-lg"
                                            >
                                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                                              <div>
                                                <div className="text-sm font-medium">
                                                  {permDetails?.label}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {permDetails?.description}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                      <div>
                                        <div className="text-sm text-muted-foreground">Created</div>
                                        <div className="text-sm font-medium flex items-center gap-1 mt-1">
                                          <Calendar className="w-3 h-3" />
                                          {formatDistanceToNow(new Date(editedUser.created_at), { addSuffix: true })}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-sm text-muted-foreground">Status</div>
                                        <Select 
                                          value={editedUser.status}
                                          onValueChange={(value: User['status']) => setEditedUser({ ...editedUser, status: value })}
                                        >
                                          <SelectTrigger className="w-full mt-1">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Inactive">Inactive</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-2 pt-4 border-t">
                                      <Button 
                                        variant="default" 
                                        className="gap-2"
                                        onClick={() => {
                                          // Handle save logic here
                                          console.log('Saving user:', editedUser);
                                          setIsDialogOpen(false);
                                        }}
                                      >
                                        Save
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        className="gap-2"
                                        onClick={() => {
                                          setEditedUser(selectedUser);
                                          setIsDialogOpen(false);
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="outline" className="gap-2 text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                            Delete User
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete <span className="font-medium">{editedUser.full_name}</span>? 
                                              This action cannot be undone. All user data, group memberships, and activity history will be permanently removed.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                              Delete User
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                </>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Reset Password"
                              >
                                <KeyRound className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset Password</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to reset the password for <span className="font-medium">{user.full_name}</span>? 
                                  A password reset link will be sent to <span className="font-medium">{user.email}</span>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction>Send Reset Link</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <span className="font-medium">{user.full_name}</span>? 
                                  This action cannot be undone. All user data, group memberships, and activity history will be permanently removed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {groups.map(group => {
              const members = getGroupMembers(group);
              return (
                <Card key={group.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <div>
                          <CardTitle className="text-base">{group.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {group.description}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Members</span>
                        <span className="font-medium">{members.length}</span>
                      </div>
                      
                      {/* Member Avatars */}
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {members.slice(0, 4).map(member => (
                            <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                              <AvatarImage src={member.avatar} alt={member.full_name} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {members.length > 4 && (
                          <span className="text-sm text-muted-foreground">
                            +{members.length - 4} more
                          </span>
                        )}
                      </div>

                      {/* Permissions */}
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Permissions</span>
                        <div className="flex flex-wrap gap-1">
                          {group.permissions.includes('*') ? (
                            <Badge variant="secondary" className="text-xs">
                              All Permissions
                            </Badge>
                          ) : (
                            group.permissions.map(perm => {
                              const permDetails = getPermissionDetails(perm);
                              return (
                                <Badge key={perm} variant="outline" className="text-xs">
                                  {permDetails?.label || perm}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          {/* Header with New Role Button */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Roles & Permissions</h3>
              <p className="text-sm text-muted-foreground">
                Define roles and their associated permissions
              </p>
            </div>
            <Dialog open={isRoleDialogOpen} onOpenChange={(open) => {
              setIsRoleDialogOpen(open);
              if (!open) {
                setEditingRole(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  className="gap-2"
                  onClick={() => {
                    // Initialize new role with default values
                    const defaultNewRole: Role = {
                      id: `role_${Date.now()}`,
                      name: "",
                      permissions: ["read"]
                    };
                    setEditingRole(defaultNewRole);
                    setIsRoleDialogOpen(true);
                  }}
                >
                  <Shield className="w-4 h-4" />
                  New Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                {editingRole && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Role Name (e.g., Editor, Moderator)"
                            value={editingRole.name}
                            onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                            className="font-medium"
                          />
                        </div>
                      </DialogTitle>
                      <DialogDescription>
                        {editingRole.id.startsWith('role_') && editingRole.name === "" 
                          ? "Create a new role by defining its name and permissions"
                          : "Edit role permissions and settings"}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 mt-4">
                      {/* Users with this role */}
                      {!editingRole.id.startsWith('role_') && (
                        <div className="space-y-2 pb-4 border-b">
                          <label className="text-sm font-medium">Users with this role</label>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {users.filter(u => u.role === editingRole.name).length} users
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Permissions */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Permissions</label>
                        <div className="space-y-2 border rounded-lg p-4">
                          {permissions.map(perm => (
                            <div key={perm.key} className="flex items-start gap-3">
                              <Checkbox
                                id={`role-perm-${perm.key}`}
                                checked={editingRole.permissions.includes(perm.key) || editingRole.permissions.includes("*")}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditingRole({
                                      ...editingRole,
                                      permissions: [...editingRole.permissions.filter(p => p !== "*"), perm.key]
                                    });
                                  } else {
                                    setEditingRole({
                                      ...editingRole,
                                      permissions: editingRole.permissions.filter(p => p !== perm.key)
                                    });
                                  }
                                }}
                                disabled={editingRole.permissions.includes("*")}
                              />
                              <div className="flex-1">
                                <label
                                  htmlFor={`role-perm-${perm.key}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {perm.label}
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  {perm.description}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-start gap-3 pt-2 border-t">
                            <Checkbox
                              id="role-perm-all"
                              checked={editingRole.permissions.includes("*")}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setEditingRole({
                                    ...editingRole,
                                    permissions: ["*"]
                                  });
                                } else {
                                  setEditingRole({
                                    ...editingRole,
                                    permissions: ["read"]
                                  });
                                }
                              }}
                            />
                            <div className="flex-1">
                              <label
                                htmlFor="role-perm-all"
                                className="text-sm font-medium cursor-pointer"
                              >
                                Full Access (All Permissions)
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Grant all current and future permissions
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Permission Summary */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Permission Summary</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          This role will have{" "}
                          <span className="font-medium text-foreground">
                            {editingRole.permissions.includes("*") 
                              ? "full access to all features" 
                              : `${editingRole.permissions.length} permission${editingRole.permissions.length !== 1 ? 's' : ''}`}
                          </span>
                          .
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-4 border-t">
                        <div>
                          {!editingRole.id.startsWith('role_') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="gap-2">
                                  <Trash2 className="w-4 h-4" />
                                  Delete Role
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the "{editingRole.name}" role? 
                                    This will affect {users.filter(u => u.role === editingRole.name).length} user(s).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      console.log('Deleting role:', editingRole);
                                      setIsRoleDialogOpen(false);
                                      setEditingRole(null);
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsRoleDialogOpen(false);
                              setEditingRole(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="default" 
                            className="gap-2"
                            onClick={() => {
                              // Handle save logic here
                              console.log(editingRole.id.startsWith('role_') ? 'Creating new role:' : 'Updating role:', editingRole);
                              setIsRoleDialogOpen(false);
                              setEditingRole(null);
                            }}
                            disabled={!editingRole.name || editingRole.permissions.length === 0}
                          >
                            {editingRole.id.startsWith('role_') ? 'Create Role' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="w-[100px]">Users</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map(role => {
                    const userCount = users.filter(u => u.role === role.name).length;
                    return (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{role.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex items-center gap-1 flex-wrap">
                              {role.permissions.map(perm => {
                                const permDetails = getPermissionDetails(perm);
                                return (
                                  <Tooltip key={perm}>
                                    <TooltipTrigger asChild>
                                      <Badge variant="secondary" className="cursor-help">
                                        {permDetails?.label || perm}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="font-medium">{permDetails?.label}</p>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {permDetails?.description}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{userCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingRole(role);
                              setIsRoleDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
