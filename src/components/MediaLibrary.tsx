import { useState, useMemo, useRef } from "react";
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
  Trash2, Edit, Tag, HardDrive, FolderOpen, X, FileText
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";

import { MediaAsset, MediaType, MediaSource, SyncStatus } from "../types/media";
import { mockMediaAssets, mockSystemDistributions, mockAIModels, mockCreators } from "../data/mockMediaData";
import { toast } from "sonner@2.0.3";

interface MediaLibraryProps {
  onNavigate: (view: string, category?: string) => void;
}

export function MediaLibrary({ onNavigate }: MediaLibraryProps) {
  const [assets, setAssets] = useState<MediaAsset[]>(mockMediaAssets);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MediaType | 'all'>('all');
  const [selectedSource, setSelectedSource] = useState<MediaSource | 'all'>('all');
  const [selectedAIModel, setSelectedAIModel] = useState<string>('all');
  const [selectedCreator, setSelectedCreator] = useState<string>('all');
  const [selectedSyncStatus, setSelectedSyncStatus] = useState<SyncStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size' | 'model'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
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

      return matchesSearch && matchesType && matchesSource && matchesAIModel && matchesCreator && matchesSyncStatus;
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

  const handleRefresh = () => {
    toast.success("Media library refreshed");
    // In real implementation, fetch from backend
  };

  const handleUpdateName = (assetId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, name: newName.trim() } : asset
    ));
    
    if (selectedAsset?.id === assetId) {
      setSelectedAsset(prev => prev ? { ...prev, name: newName.trim() } : null);
    }
    
    toast.success("Display name updated");
    setEditingName('');
  };

  const handleUpdateDescription = (assetId: string, newDescription: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, description: newDescription.trim() } : asset
    ));
    
    if (selectedAsset?.id === assetId) {
      setSelectedAsset(prev => prev ? { ...prev, description: newDescription.trim() } : null);
    }
    
    toast.success("Description updated");
    setEditingDescription('');
  };

  const handleAddTag = (assetId: string) => {
    const tag = newTag.trim();
    if (!tag) return;
    
    const asset = assets.find(a => a.id === assetId);
    if (asset?.tags.includes(tag)) {
      toast.error("Tag already exists");
      return;
    }
    
    setAssets(prev => prev.map(a => 
      a.id === assetId ? { ...a, tags: [...a.tags, tag] } : a
    ));
    
    if (selectedAsset?.id === assetId) {
      setSelectedAsset(prev => prev ? { ...prev, tags: [...prev.tags, tag] } : null);
    }
    
    setNewTag('');
    toast.success("Tag added");
  };

  const handleRemoveTag = (assetId: string, tagToRemove: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, tags: asset.tags.filter(t => t !== tagToRemove) } : asset
    ));
    
    if (selectedAsset?.id === assetId) {
      setSelectedAsset(prev => prev ? { ...prev, tags: prev.tags.filter(t => t !== tagToRemove) } : null);
    }
    
    toast.success("Tag removed");
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

  const handleUpload = () => {
    if (!uploadForm.name) {
      toast.error("Please enter a file name");
      return;
    }

    // Determine media type from file or form
    const fileType = selectedFile?.type || 'image/png';
    const mediaType: MediaType = fileType.startsWith('image') 
      ? 'image' 
      : fileType.startsWith('video') 
      ? 'video' 
      : fileType.startsWith('audio') 
      ? 'audio' 
      : 'image';

    // Create object URL for preview (if file selected)
    const fileUrl = selectedFile 
      ? URL.createObjectURL(selectedFile)
      : "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800";

    const newAsset: MediaAsset = {
      id: Date.now().toString(),
      name: uploadForm.name,
      description: uploadForm.description,
      file_url: fileUrl,
      thumbnail_url: fileUrl,
      file_type: mediaType,
      file_size: selectedFile?.size || 1234567,
      dimensions: { width: 1920, height: 1080 },
      source: "user-uploaded",
      created_by: "user@emergent.tv",
      created_at: new Date().toISOString(),
      tags: uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      usage_count: 0,
      sync_status: "synced"
    };

    setAssets([newAsset, ...assets]);
    setShowUploadDialog(false);
    setUploadForm({ name: '', description: '', tags: '' });
    setSelectedFile(null);
    setPreviewUrl(null);
    toast.success("Media uploaded successfully");
  };

  const handleCopyURL = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const handleDelete = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
    setSelectedAsset(null);
    toast.success("Media deleted");
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

  const getSyncStatusBadge = (status: SyncStatus) => {
    switch (status) {
      case 'synced':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 gap-1"><CheckCircle2 className="w-3 h-3" />Synced</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 gap-1"><AlertCircle className="w-3 h-3" />Error</Badge>;
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
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
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
                {mockAIModels.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCreator} onValueChange={setSelectedCreator}>
              <SelectTrigger>
                <SelectValue placeholder="Creator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Creators</SelectItem>
                {mockCreators.map(creator => (
                  <SelectItem key={creator} value={creator}>
                    {creator.startsWith('auto:') ? creator : creator.split('@')[0]}
                  </SelectItem>
                ))}
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

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAssets.length} of {assets.length} media assets
      </div>

      {/* Media Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssets.map((asset) => (
            <Card 
              key={asset.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full"
              onClick={() => setSelectedAsset(asset)}
            >
              <div className="relative h-48 bg-muted flex-shrink-0">
                <img 
                  src={asset.thumbnail_url || asset.file_url} 
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2">
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
                  {getSyncStatusBadge(asset.sync_status)}
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
                  className="p-4 hover:bg-muted/50 cursor-pointer flex items-center gap-4"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <img 
                    src={asset.thumbnail_url || asset.file_url} 
                    alt={asset.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{asset.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{asset.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSourceBadge(asset)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatFileSize(asset.file_size)}
                  </div>
                  {getSyncStatusBadge(asset.sync_status)}
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
                    <img 
                      src={selectedAsset.file_url} 
                      alt={selectedAsset.name}
                      className="w-full h-full object-contain"
                    />
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
                  <h3 className="text-lg font-semibold">System Distribution</h3>
                  {mockSystemDistributions[selectedAsset.id] ? (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>System</TableHead>
                            <TableHead>Path</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Sync</TableHead>
                            <TableHead className="w-[50px]">Logs</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mockSystemDistributions[selectedAsset.id].map((dist, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    const fullPath = dist.path.endsWith('/') || dist.path.endsWith('\\') 
                                      ? `${dist.path}${selectedAsset.name}` 
                                      : `${dist.path}/${selectedAsset.name}`;
                                    navigator.clipboard.writeText(fullPath);
                                    toast.success('Path copied to clipboard');
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <HardDrive className="w-4 h-4" />
                                {dist.system_name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {dist.path.endsWith('/') || dist.path.endsWith('\\') 
                                  ? `${dist.path}${selectedAsset.name}` 
                                  : `${dist.path}/${selectedAsset.name}`}
                              </TableCell>
                              <TableCell>
                                {getSyncStatusBadge(dist.status)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {dist.last_sync ? formatDate(dist.last_sync) : '-'}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => toast.info('Sync logs feature coming soon')}
                                  aria-label="View sync logs"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
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
            <Button variant="ghost" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
