import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { 
  Upload, RefreshCw, Grid3x3, List, Search, Filter, 
  Image as ImageIcon, Video, Music, Box, Brain, User, 
  CheckCircle2, Clock, AlertCircle, Copy, Download, 
  Trash2, Edit, Tag, HardDrive, FolderOpen, X, FileText, Loader2,
  Pause, XCircle, Plus, Server
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";

import { MediaAsset, MediaType, MediaSource, SyncStatus } from "../types/media";
import { toast } from "sonner@2.0.3";
import { useMediaData } from "../utils/useMediaData";
import { copyToClipboard } from "../utils/clipboard";
import { VideoThumbnail } from "./VideoThumbnail";
import { projectId, publicAnonKey } from "../utils/supabase/info";

// Temporary empty object for distributions until backend provides this data
const mockSystemDistributions: Record<string, any[]> = {};

interface MediaLibraryProps {
  onNavigate: (view: string, category?: string) => void;
}

export function MediaLibrary({ onNavigate }: MediaLibraryProps) {
  // Backend integration with useMediaData hook
  const {
    assets: backendAssets,
    loading: backendLoading,
    error: backendError,
    count: backendCount,
    refresh,
    uploadAsset,
    updateAsset,
    deleteAsset,
    bulkDelete,
    bulkAddTags,
    bulkArchive,
  } = useMediaData({
    limit: 100, // Load more items initially
    offset: 0,
  });

  // Local state for UI - start with empty array, will be populated by backend
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MediaType | 'all'>('all');
  const [selectedSource, setSelectedSource] = useState<MediaSource | 'all'>('all');
  const [selectedAIModel, setSelectedAIModel] = useState<string>('all');
  const [selectedCreator, setSelectedCreator] = useState<string>('all');
  const [selectedSyncStatus, setSelectedSyncStatus] = useState<SyncStatus | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size' | 'model'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    tags: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline editing states
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // System assignment states
  const [availableSystems, setAvailableSystems] = useState<any[]>([]);
  const [showSystemDropdown, setShowSystemDropdown] = useState(false);
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [assigningSystem, setAssigningSystem] = useState(false);

  // Derive unique AI models and creators from assets
  const uniqueAIModels = useMemo(() => {
    const models = assets
      .map(asset => asset.ai_model_used)
      .filter((model): model is string => !!model);
    return Array.from(new Set(models));
  }, [assets]);

  const uniqueCreators = useMemo(() => {
    const creators = assets.map(asset => asset.created_by);
    return Array.from(new Set(creators));
  }, [assets]);

  // Sync backend data to local state when it changes
  useEffect(() => {
    // Always sync from backend, even if empty
    setAssets(backendAssets);
  }, [backendAssets]);

  // Show error toast if backend fails
  useEffect(() => {
    if (backendError) {
      toast.error(`Backend Error: ${backendError}`);
    }
  }, [backendError]);

  // Clear selection when filters change
  useEffect(() => {
    clearSelection();
  }, [searchQuery, selectedType, selectedSource, selectedAIModel, selectedCreator, selectedSyncStatus, showArchived]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSystemDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.system-dropdown-container')) {
          setShowSystemDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSystemDropdown]);

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    let filtered = assets.filter(asset => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        asset.name.toLowerCase().includes(searchLower) ||
        asset.description?.toLowerCase().includes(searchLower) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        asset.ai_model_used?.toLowerCase().includes(searchLower);

      // Type filter
      const matchesType = selectedType === 'all' || asset.file_type === selectedType;

      // Source filter
      const matchesSource = selectedSource === 'all' || asset.source === selectedSource;

      // AI Model filter
      const matchesAIModel = selectedAIModel === 'all' || asset.ai_model_used === selectedAIModel;

      // Creator filter
      const matchesCreator = selectedCreator === 'all' || asset.created_by === selectedCreator;

      // Sync status filter
      const matchesSyncStatus = selectedSyncStatus === 'all' || asset.sync_status === selectedSyncStatus;

      // Archive filter - only show archived items if showArchived is true
      const isArchived = asset.metadata?.archived === true;
      const matchesArchiveFilter = showArchived ? isArchived : !isArchived;

      return matchesSearch && matchesType && matchesSource && matchesAIModel && matchesCreator && matchesSyncStatus && matchesArchiveFilter;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.file_size - b.file_size;
          break;
        case 'model':
          comparison = (a.ai_model_used || '').localeCompare(b.ai_model_used || '');
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [assets, searchQuery, selectedType, selectedSource, selectedAIModel, selectedCreator, selectedSyncStatus, sortBy, sortOrder]);

  const handleRefresh = async () => {
    await refresh();
    toast.success("Media library refreshed");
  };

  const handleUpdateName = async (assetId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    
    const result = await updateAsset(assetId, { name: newName.trim() });
    if (result.success) {
      toast.success("Display name updated");
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(prev => prev ? { ...prev, name: newName.trim() } : null);
      }
    } else {
      toast.error(result.error || "Failed to update name");
    }
    
    setEditingName('');
  };

  const handleUpdateDescription = async (assetId: string, newDescription: string) => {
    const result = await updateAsset(assetId, { description: newDescription.trim() });
    if (result.success) {
      toast.success("Description updated");
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(prev => prev ? { ...prev, description: newDescription.trim() } : null);
      }
    } else {
      toast.error(result.error || "Failed to update description");
    }
    
    setEditingDescription('');
  };

  const handleAddTag = async (assetId: string) => {
    const tag = newTag.trim();
    if (!tag) return;
    
    console.log('🏷️ Adding tag:', tag, 'to asset:', assetId);
    
    const asset = assets.find(a => a.id === assetId);
    if (asset?.tags.includes(tag)) {
      toast.error("Tag already exists");
      setNewTag('');
      return;
    }
    
    const newTags = [...(asset?.tags || []), tag];
    console.log('🏷️ New tags array:', newTags);
    
    // Clear input immediately for better UX
    setNewTag('');
    
    const result = await updateAsset(assetId, { tags: newTags });
    if (result.success) {
      console.log('✅ Tag added successfully');
      toast.success("Tag added");
      // Update selectedAsset with new tags
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(prev => prev ? { ...prev, tags: newTags } : null);
      }
    } else {
      console.error('❌ Failed to add tag:', result.error);
      toast.error(result.error || "Failed to add tag");
    }
  };

  const handleRemoveTag = async (assetId: string, tagToRemove: string) => {
    console.log('🏷️ Removing tag:', tagToRemove, 'from asset:', assetId);
    
    const asset = assets.find(a => a.id === assetId);
    const newTags = asset?.tags.filter(t => t !== tagToRemove) || [];
    console.log('🏷️ New tags array after removal:', newTags);
    
    const result = await updateAsset(assetId, { tags: newTags });
    if (result.success) {
      console.log('✅ Tag removed successfully');
      toast.success("Tag removed");
      // Update selectedAsset with new tags
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(prev => prev ? { ...prev, tags: newTags } : null);
      }
    } else {
      console.error('❌ Failed to remove tag:', result.error);
      toast.error(result.error || "Failed to remove tag");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Create preview URL for image/video
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
    
    // Auto-populate form with file information
    setUploadForm({
      name: file.name,
      description: `Uploaded ${file.type.split('/')[0]} file`,
      tags: file.type.split('/')[0], // e.g., "image", "video", "audio"
    });

    toast.success(`Selected: ${file.name}`);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      
      // Create preview URL for image/video
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
      
      // Auto-populate form with file information
      setUploadForm({
        name: file.name,
        description: `Uploaded ${file.type.split('/')[0]} file`,
        tags: file.type.split('/')[0],
      });

      toast.success(`Selected: ${file.name}`);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.name) {
      toast.error("Please enter a file name");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);

    // Upload to backend
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", uploadForm.name);
    formData.append("description", uploadForm.description);
    formData.append("tags", JSON.stringify(uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean)));
    
    // Determine media type from file
    const fileType = selectedFile.type;
    const mediaType = fileType.startsWith('image') 
      ? 'image' 
      : fileType.startsWith('video') 
      ? 'video' 
      : fileType.startsWith('audio') 
      ? 'audio' 
      : fileType.startsWith('model') || fileType.includes('3d')
      ? '3d'
      : 'image';
    
    formData.append("media_type", mediaType);
    formData.append("created_by", "user@emergent.tv");

    const result = await uploadAsset(formData);
    
    setIsUploading(false);

    if (result.success) {
      toast.success("Media uploaded successfully");
      setShowUploadDialog(false);
      setUploadForm({ name: '', description: '', tags: '' });
      setSelectedFile(null);
      setPreviewUrl(null);
    } else {
      toast.error(result.error || "Failed to upload media");
    }
  };

  const handleCopyURL = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      toast.success("URL copied to clipboard");
    } else {
      toast.error("Failed to copy URL to clipboard");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAsset(id);
    if (result.success) {
      toast.success("Media deleted");
      setSelectedAsset(null);
    } else {
      toast.error(result.error || "Failed to delete media");
    }
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowBulkActions(false);
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Delete ${selectedIds.size} selected item(s)?`)) return;
    
    const idsToDelete = Array.from(selectedIds);
    const result = await bulkDelete(idsToDelete);

    if (result.success > 0) {
      toast.success(`${result.success} item(s) deleted successfully`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} item(s) failed to delete`);
      console.error('Bulk delete errors:', result.errors);
    }

    clearSelection();
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    
    const idsToArchive = Array.from(selectedIds);
    const result = await bulkArchive(idsToArchive);

    if (result.success > 0) {
      toast.success(`${result.success} item(s) archived successfully`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} item(s) failed to archive`);
      console.error('Bulk archive errors:', result.errors);
    }

    clearSelection();
  };

  const handleBulkAddTags = async () => {
    if (selectedIds.size === 0 || !bulkTagInput.trim()) return;
    
    const newTags = bulkTagInput.split(',').map(t => t.trim()).filter(t => t);
    if (newTags.length === 0) {
      toast.error('Please enter at least one tag');
      return;
    }

    const idsToUpdate = Array.from(selectedIds);
    const result = await bulkAddTags(idsToUpdate, newTags);

    if (result.success > 0) {
      toast.success(`Tags added to ${result.success} item(s)`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} item(s) failed to update`);
      console.error('Bulk tag update errors:', result.errors);
    }

    setBulkTagInput('');
    clearSelection();
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    
    toast.info('Preparing download... This may take a moment');
    
    const selectedAssets = assets.filter(a => selectedIds.has(a.id));
    
    // Download each file individually (browser will handle multiple downloads)
    for (const asset of selectedAssets) {
      if (asset.url) {
        try {
          const link = document.createElement('a');
          link.href = asset.url;
          link.download = asset.name;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Failed to download ${asset.name}:`, error);
        }
      }
    }
    
    toast.success(`Downloading ${selectedAssets.length} file(s)`);
  };

  // System assignment functions
  const fetchAvailableSystems = async () => {
    if (availableSystems.length > 0) {
      setShowSystemDropdown(true);
      return;
    }

    try {
      setLoadingSystems(true);
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/media-library`;

      const response = await fetch(`${baseUrl}/systems`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch systems: ${response.statusText}`);
      }

      const result = await response.json();
      setAvailableSystems(result.data || []);
      setShowSystemDropdown(true);
      console.log(`✅ Loaded ${result.data?.length || 0} systems`);
    } catch (error) {
      console.error("Error fetching systems:", error);
      toast.error("Failed to load systems");
    } finally {
      setLoadingSystems(false);
    }
  };

  const handleAssignSystem = async (systemId: string) => {
    if (!selectedAsset) return;

    try {
      setAssigningSystem(true);
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/media-library`;

      const response = await fetch(`${baseUrl}/distribute`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_asset_id: selectedAsset.id,
          system_ids: [systemId],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to assign system: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success > 0) {
        toast.success("System assigned successfully");
        setShowSystemDropdown(false);
        refresh(); // Refresh the asset data to show the new distribution
      } else {
        toast.error(`Failed to assign system: ${result.errors.join(", ")}`);
      }
    } catch (error) {
      console.error("Error assigning system:", error);
      toast.error(error instanceof Error ? error.message : "Failed to assign system");
    } finally {
      setAssigningSystem(false);
    }
  };

  const handleRemoveDistribution = async (distributionId: string) => {
    if (!confirm("Remove this system distribution?")) return;

    try {
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/media-library`;

      const response = await fetch(`${baseUrl}/distribute/${distributionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to remove distribution: ${response.statusText}`);
      }

      toast.success("Distribution removed");
      refresh(); // Refresh the asset data
    } catch (error) {
      console.error("Error removing distribution:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove distribution");
    }
  };

  // Debug function to test backend connection
  const testBulkEndpoint = async () => {
    console.log("🧪 Testing bulk endpoint...");
    try {
      const testIds = Array.from(selectedIds).slice(0, 1); // Test with just 1 ID
      if (testIds.length === 0) {
        toast.error("Please select at least one item to test");
        return;
      }
      
      const result = await bulkAddTags(testIds, ["test-tag"]);
      console.log("🧪 Test result:", result);
      toast.success(`Test complete: ${result.success} success, ${result.failed} failed`);
    } catch (error) {
      console.error("🧪 Test error:", error);
      toast.error(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const getFileTypeIcon = (type: MediaType) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case '3d': return <Box className="w-4 h-4" />;
    }
  };

  const getSourceBadge = (asset: MediaAsset) => {
    if (asset.source === 'ai-generated' && asset.ai_model_used) {
      const modelColors: Record<string, string> = {
        'Midjourney v6': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        'DALL·E 3': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        'SDXL Turbo v1.1': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
        'Adobe Firefly': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      };
      
      const colorClass = modelColors[asset.ai_model_used] || 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300';
      
      return (
        <Badge className={`${colorClass} gap-1`}>
          <Brain className="w-3 h-3" />
          {asset.ai_model_used}
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 gap-1">
        <User className="w-3 h-3" />
        User
      </Badge>
    );
  };

  const getSyncStatusBadge = (status: SyncStatus, assetId?: string) => {
    // For asset-level sync status, check if there are distributions
    const hasDistributions = assetId && mockSystemDistributions[assetId]?.length > 0;
    
    switch (status) {
      case 'synced':
        // If assetId is provided and no distributions exist, show "no sync"
        if (assetId && !hasDistributions) {
          return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 gap-1"><XCircle className="w-3 h-3" />No Sync</Badge>;
        }
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 gap-1"><CheckCircle2 className="w-3 h-3" />Synced</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'paused':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 gap-1"><Pause className="w-3 h-3" />Paused</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 gap-1"><AlertCircle className="w-3 h-3" />Sync Failed</Badge>;
      case 'none':
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 gap-1"><XCircle className="w-3 h-3" />No Sync</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeFilterCount = [
    selectedType !== 'all',
    selectedSource !== 'all',
    selectedAIModel !== 'all',
    selectedCreator !== 'all',
    selectedSyncStatus !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="flex items-center gap-2">
            <HardDrive className="w-6 h-6" />
            Media Library
          </h1>
          <Badge variant="outline" className="gap-1.5">
            {backendLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </>
            ) : backendError ? (
              <>
                <AlertCircle className="w-3 h-3 text-red-600" />
                Connection Error
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                {backendCount} {backendCount === 1 ? 'Asset' : 'Assets'}
              </>
            )}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={backendLoading}
          >
            <RefreshCw className={`w-4 h-4 ${backendLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </Button>
          <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Media
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, tags, description, or AI model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as MediaType | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="3d">3D</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={(value) => setSelectedSource(value as MediaSource | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="ai-generated">AI-Generated</SelectItem>
                <SelectItem value="user-uploaded">User-Uploaded</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
              <SelectTrigger>
                <SelectValue placeholder="AI Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {uniqueAIModels.length > 0 ? (
                  uniqueAIModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No AI models yet</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select value={selectedCreator} onValueChange={setSelectedCreator}>
              <SelectTrigger>
                <SelectValue placeholder="Creator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Creators</SelectItem>
                {uniqueCreators.length > 0 ? (
                  uniqueCreators.map(creator => (
                    <SelectItem key={creator} value={creator}>
                      {creator.startsWith('auto:') ? creator : creator.split('@')[0]}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No creators yet</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select value={selectedSyncStatus} onValueChange={(value) => setSelectedSyncStatus(value as SyncStatus | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [sort, order] = value.split('-');
              setSortBy(sort as typeof sortBy);
              setSortOrder(order as typeof sortOrder);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="size-desc">Size (Largest)</SelectItem>
                <SelectItem value="size-asc">Size (Smallest)</SelectItem>
                <SelectItem value="model-asc">Model (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count & Selection */}
      {assets.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredAssets.length} of {assets.length} media assets
            {selectedIds.size > 0 && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                ({selectedIds.size} selected)
              </span>
            )}
          </div>
          {filteredAssets.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === filteredAssets.length && filteredAssets.length > 0}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <Label htmlFor="select-all" className="text-sm cursor-pointer">
                Select All
              </Label>
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkArchive}
                    className="gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDownload}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add tags (comma-separated)"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  className="w-64"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBulkAddTags();
                    }
                  }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBulkAddTags}
                  disabled={!bulkTagInput.trim()}
                  className="gap-2"
                >
                  <Tag className="w-4 h-4" />
                  Add Tags
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Grid */}
      {backendLoading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading media library...</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              {assets.length === 0 ? (
                <>
                  <HardDrive className="w-16 h-16 text-muted-foreground opacity-50" />
                  <div className="space-y-2">
                    <h3 className="text-lg">No Media Assets Yet</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Your media library is empty. Upload your first asset to get started.
                    </p>
                  </div>
                  <Button onClick={() => setShowUploadDialog(true)} className="gap-2 mt-4">
                    <Upload className="w-4 h-4" />
                    Upload Your First Asset
                  </Button>
                </>
              ) : (
                <>
                  <Search className="w-16 h-16 text-muted-foreground opacity-50" />
                  <div className="space-y-2">
                    <h3 className="text-lg">No Results Found</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      No assets match your current filters. Try adjusting your search or filters.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedType('all');
                      setSelectedSource('all');
                      setSelectedAIModel('all');
                      setSelectedCreator('all');
                      setSelectedSyncStatus('all');
                    }}
                    className="gap-2 mt-4"
                  >
                    <X className="w-4 h-4" />
                    Clear All Filters
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssets.map((asset) => (
            <Card 
              key={asset.id}
              className={`overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full ${
                selectedIds.has(asset.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div 
                className="relative h-48 bg-muted flex-shrink-0 cursor-pointer"
                onClick={() => setSelectedAsset(asset)}
              >
                {asset.file_type === 'video' ? (
                  <VideoThumbnail 
                    videoUrl={asset.file_url}
                    alt={asset.name}
                    className="w-full h-full"
                  />
                ) : asset.file_type === 'audio' ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900">
                    <Music className="w-20 h-20 text-purple-600 dark:text-purple-300" />
                  </div>
                ) : (
                  <img 
                    src={asset.thumbnail_url || asset.file_url} 
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <div 
                    className="bg-white/70 dark:bg-gray-800/70 rounded p-1 shadow-sm cursor-pointer hover:bg-white hover:dark:bg-gray-800 hover:shadow-md transition-all opacity-80 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectItem(asset.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedIds.has(asset.id)}
                      onCheckedChange={() => handleSelectItem(asset.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {getSourceBadge(asset)}
                </div>
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="gap-1">
                    {getFileTypeIcon(asset.file_type)}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-3 space-y-2 flex-1 flex flex-col">
                <p className="truncate -mt-1 text-[rgba(10,10,10,0.77)] font-bold font-[Sans_Serif_Collection]">{asset.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {asset.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                  {asset.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">+{asset.tags.length - 2}</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                  <span>{formatFileSize(asset.file_size)}</span>
                  {getSyncStatusBadge(asset.sync_status, asset.id)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredAssets.map((asset) => (
                <div 
                  key={asset.id}
                  className={`p-4 hover:bg-muted/50 flex items-center gap-4 ${
                    selectedIds.has(asset.id) ? 'bg-blue-50 dark:bg-blue-950' : ''
                  }`}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectItem(asset.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedIds.has(asset.id)}
                      onCheckedChange={() => handleSelectItem(asset.id)}
                    />
                  </div>
                  {asset.file_type === 'video' ? (
                    <div 
                      className="w-16 h-16 rounded cursor-pointer overflow-hidden"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <VideoThumbnail 
                        videoUrl={asset.file_url}
                        alt={asset.name}
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <img 
                      src={asset.thumbnail_url || asset.file_url} 
                      alt={asset.name}
                      className="w-16 h-16 object-cover rounded cursor-pointer"
                      onClick={() => setSelectedAsset(asset)}
                    />
                  )}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <p className="truncate">{asset.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{asset.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSourceBadge(asset)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatFileSize(asset.file_size)}
                  </div>
                  {getSyncStatusBadge(asset.sync_status, asset.id)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Detail Dialog */}
      {selectedAsset && (
        <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
          <DialogContent className="!max-w-[875px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedAsset.name}</DialogTitle>
              <DialogDescription>
                Created {formatDate(selectedAsset.created_at)} by {selectedAsset.created_by}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 overflow-auto">
              <div className="space-y-6 pb-4 pr-4">
                {/* Preview Section */}
                <div className="space-y-4">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    {selectedAsset.file_type === 'video' ? (
                      <video 
                        src={selectedAsset.file_url} 
                        controls
                        className="w-full h-full"
                        preload="metadata"
                      />
                    ) : selectedAsset.file_type === 'audio' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8">
                        <Music className="w-24 h-24 text-muted-foreground mb-4" />
                        <audio 
                          src={selectedAsset.file_url} 
                          controls
                          className="w-full max-w-md"
                          preload="metadata"
                        />
                      </div>
                    ) : (
                      <img 
                        src={selectedAsset.file_url} 
                        alt={selectedAsset.name}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  {selectedAsset.dimensions && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1.5">
                        {selectedAsset.file_type === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
                        {selectedAsset.file_type === 'video' && <Video className="w-3.5 h-3.5" />}
                        {selectedAsset.file_type === 'audio' && <Music className="w-3.5 h-3.5" />}
                        {selectedAsset.file_type ? selectedAsset.file_type.charAt(0).toUpperCase() + selectedAsset.file_type.slice(1) : 'Unknown'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {selectedAsset.dimensions.width} × {selectedAsset.dimensions.height} • {formatFileSize(selectedAsset.file_size)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metadata Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Metadata</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Editable Display Name */}
                    <div className="col-span-2">
                      <Label>Display Name</Label>
                      <Input
                        value={editingName || selectedAsset.name}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => {
                          if (editingName && editingName !== selectedAsset.name) {
                            handleUpdateName(selectedAsset.id, editingName);
                          } else {
                            setEditingName('');
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editingName && editingName !== selectedAsset.name) {
                              handleUpdateName(selectedAsset.id, editingName);
                            }
                          } else if (e.key === 'Escape') {
                            setEditingName('');
                          }
                        }}
                        onFocus={() => setEditingName(selectedAsset.name)}
                        placeholder="Enter display name..."
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        File name: {selectedAsset.name.split('.')[0] + (selectedAsset.name.includes('.') ? '.' + selectedAsset.name.split('.').pop() : '')}
                      </p>
                    </div>

                    {/* Editable Description */}
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editingDescription !== '' ? editingDescription : (selectedAsset.description || '')}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        onBlur={() => {
                          if (editingDescription !== '' && editingDescription !== (selectedAsset.description || '')) {
                            handleUpdateDescription(selectedAsset.id, editingDescription);
                          } else {
                            setEditingDescription('');
                          }
                        }}
                        onFocus={() => setEditingDescription(selectedAsset.description || '')}
                        placeholder="Add description..."
                        className="mt-1 min-h-[80px]"
                      />
                    </div>

                    {/* Editable Tags */}
                    <div className="col-span-2">
                      <Label>Tags</Label>
                      <div className="flex items-center gap-2 flex-wrap border rounded-md p-2 mt-1 min-h-[42px] bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        {selectedAsset.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="gap-1 pr-1">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(selectedAsset.id, tag)}
                              className="ml-1 hover:bg-muted rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTag.trim()) {
                              e.preventDefault();
                              handleAddTag(selectedAsset.id);
                            } else if (e.key === 'Backspace' && !newTag && selectedAsset.tags.length > 0) {
                              handleRemoveTag(selectedAsset.id, selectedAsset.tags[selectedAsset.tags.length - 1]);
                            }
                          }}
                          placeholder={selectedAsset.tags.length === 0 ? "Type to add tags..." : ""}
                          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Source</Label>
                      <div className="mt-1">{getSourceBadge(selectedAsset)}</div>
                    </div>
                    {selectedAsset.ai_model_used && (
                      <div>
                        <Label>AI Model</Label>
                        <p className="text-sm mt-1">{selectedAsset.ai_model_used}</p>
                      </div>
                    )}
                    <div>
                      <Label>Created By</Label>
                      <p className="text-sm mt-1">{selectedAsset.created_by}</p>
                    </div>
                    <div>
                      <Label>Created At</Label>
                      <p className="text-sm mt-1">{formatDate(selectedAsset.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Distribution Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">System Distribution</h3>
                    <div className="relative system-dropdown-container">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (showSystemDropdown) {
                            setShowSystemDropdown(false);
                          } else {
                            fetchAvailableSystems();
                          }
                        }}
                        disabled={loadingSystems || assigningSystem}
                        className="gap-2"
                      >
                        {loadingSystems ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Add System
                      </Button>

                      {/* Systems Dropdown */}
                      {showSystemDropdown && (
                        <Card className="absolute top-full right-0 mt-2 w-80 z-50 shadow-lg">
                          <CardContent className="p-0">
                            <ScrollArea className="max-h-64">
                              <div className="p-2">
                                {availableSystems.length === 0 ? (
                                  <div className="text-center py-6 text-muted-foreground text-sm">
                                    <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No systems available</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {availableSystems.map((system) => (
                                      <button
                                        key={system.id}
                                        onClick={() => handleAssignSystem(system.id)}
                                        disabled={assigningSystem}
                                        className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                                      >
                                        <div className="flex items-start gap-3">
                                          <Server className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">{system.name}</div>
                                            {system.description && (
                                              <div className="text-xs text-muted-foreground truncate">
                                                {system.description}
                                              </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                              <Badge variant="outline" className="text-xs">
                                                {system.system_type}
                                              </Badge>
                                              {system.ip_address && (
                                                <span className="text-xs text-muted-foreground">
                                                  {system.ip_address}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>

                  {selectedAsset.distribution && selectedAsset.distribution.length > 0 ? (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>System</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Directory</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Sync</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedAsset.distribution.map((dist: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Server className="w-4 h-4 text-muted-foreground" />
                                  <span>{dist.systems?.name || dist.system_name || 'Unknown System'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {dist.systems?.ip_address || '-'}
                              </TableCell>
                              <TableCell className="text-sm font-mono">
                                {dist.path || '-'}
                              </TableCell>
                              <TableCell>
                                {getSyncStatusBadge(dist.status)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {dist.last_sync ? formatDate(dist.last_sync) : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => toast.info('Sync logs feature coming soon')}
                                    aria-label="View sync logs"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    onClick={() => dist.id && handleRemoveDistribution(dist.id)}
                                    aria-label="Remove distribution"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <HardDrive className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Not distributed to any systems yet</p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <div className="flex items-center gap-2 mr-auto">
                <Button variant="outline" size="sm" onClick={() => handleCopyURL(selectedAsset.file_url)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy URL
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Create a temporary anchor element to trigger download
                    const link = document.createElement('a');
                    link.href = selectedAsset.file_url;
                    link.download = selectedAsset.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success(`Downloading ${selectedAsset.name}`);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              <Button onClick={() => setSelectedAsset(null)}>
                Save
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(selectedAsset.id)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        setShowUploadDialog(open);
        if (!open) {
          // Clean up preview URL when dialog closes
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          setSelectedFile(null);
          setPreviewUrl(null);
          setUploadForm({ name: '', description: '', tags: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
            <DialogDescription>
              Add new media to your library
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedFile ? (
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 mx-auto mb-2 text-black" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop files here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={handleBrowseClick}>Browse Files</Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-4 relative">
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={handleClearFile}
                >
                  <X className="w-4 h-4" />
                </Button>
                
                {previewUrl && selectedFile.type.startsWith('image/') && (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-64 object-contain rounded"
                  />
                )}
                
                {previewUrl && selectedFile.type.startsWith('video/') && (
                  <video 
                    src={previewUrl} 
                    controls 
                    className="w-full h-64 rounded"
                  />
                )}
                
                {selectedFile.type.startsWith('audio/') && (
                  <div className="flex items-center justify-center h-32 bg-muted rounded">
                    <div className="text-center">
                      <Music className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm">{selectedFile.name}</p>
                    </div>
                  </div>
                )}
                
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  <p>{selectedFile.name}</p>
                  <p className="text-xs">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="upload-name">Name</Label>
                <Input
                  id="upload-name"
                  placeholder="e.g., stadium_night_v6.png"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="upload-description">Description</Label>
                <Textarea
                  id="upload-description"
                  placeholder="Optional description..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="upload-tags">Tags</Label>
                <Input
                  id="upload-tags"
                  placeholder="e.g., stadium, night, LED (comma-separated)"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="generate-thumbnail" defaultChecked />
                <Label htmlFor="generate-thumbnail" className="text-sm">
                  Generate Thumbnail
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setShowUploadDialog(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
