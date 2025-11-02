import { useState } from "react";
import { 
  Feed, 
  FeedType, 
  FeedCategory, 
  RestApiConfig,
  DatabaseConfig,
  FileConfig,
  WebhookConfig,
  HttpMethod,
  FileFormat
} from "../types/feeds";
import { FeedsFilters } from "./FeedsFilters";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Pencil, Trash2, Cloud, Database as DatabaseIcon, File, Webhook, Play, Rss } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedsDashboardProps {
  feeds: Feed[];
  onUpdateFeed: (feed: Feed) => void;
  onAddFeed: (feed: Feed) => void;
  onDeleteFeed: (feedId: string) => void;
  lastUpdated: string;
  initialCategory?: FeedCategory;
}

export function FeedsDashboard({
  feeds,
  onUpdateFeed,
  onAddFeed,
  onDeleteFeed,
  lastUpdated,
  initialCategory,
}: FeedsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<FeedType | "All">("All");
  const [selectedCategory, setSelectedCategory] = useState<FeedCategory | "All">(initialCategory || "All");
  const [selectedStatus, setSelectedStatus] = useState<"Active" | "Inactive" | "All">("All");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<FeedType>("REST API");
  const [formCategory, setFormCategory] = useState<FeedCategory>("Elections");
  const [formActive, setFormActive] = useState(true);
  
  // REST API config state
  const [apiUrl, setApiUrl] = useState("");
  const [httpMethod, setHttpMethod] = useState<HttpMethod>("GET");
  const [dataPath, setDataPath] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  
  // Database config state
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [query, setQuery] = useState("");
  
  // File config state
  const [filePath, setFilePath] = useState("");
  const [fileFormat, setFileFormat] = useState<FileFormat>("json");
  
  // Webhook config state
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secret, setSecret] = useState("");

  const filteredFeeds = feeds.filter((feed) => {
    const matchesSearch = feed.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "All" || feed.type === selectedType;
    const matchesCategory = selectedCategory === "All" || feed.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || 
      (selectedStatus === "Active" && feed.active) || 
      (selectedStatus === "Inactive" && !feed.active);
    
    return matchesSearch && matchesType && matchesCategory && matchesStatus;
  });

  const getTypeIcon = (type: FeedType) => {
    switch (type) {
      case "REST API":
        return <Cloud className="w-4 h-4" />;
      case "Database":
        return <DatabaseIcon className="w-4 h-4" />;
      case "File":
        return <File className="w-4 h-4" />;
      case "Webhook":
        return <Webhook className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormType("REST API");
    setFormCategory("Elections");
    setFormActive(true);
    // REST API
    setApiUrl("");
    setHttpMethod("GET");
    setDataPath("");
    setApiKey("");
    setApiSecret("");
    // Database
    setHost("");
    setPort("");
    setDatabaseName("");
    setQuery("");
    // File
    setFilePath("");
    setFileFormat("json");
    // Webhook
    setWebhookUrl("");
    setSecret("");
  };

  const loadFormData = (feed: Feed) => {
    setFormName(feed.name);
    setFormType(feed.type);
    setFormCategory(feed.category);
    setFormActive(feed.active);

    const config = feed.configuration;
    
    if (feed.type === "REST API" && "apiUrl" in config) {
      setApiUrl(config.apiUrl);
      setHttpMethod(config.httpMethod);
      setDataPath(config.dataPath);
      setApiKey(config.apiKey || "");
      setApiSecret(config.apiSecret || "");
    } else if (feed.type === "Database" && "host" in config) {
      setHost(config.host);
      setPort(config.port);
      setDatabaseName(config.databaseName);
      setQuery(config.query);
    } else if (feed.type === "File" && "filePath" in config) {
      setFilePath(config.filePath);
      setFileFormat(config.format);
    } else if (feed.type === "Webhook" && "webhookUrl" in config) {
      setWebhookUrl(config.webhookUrl);
      setSecret(config.secret);
    }
  };

  const buildConfiguration = (): RestApiConfig | DatabaseConfig | FileConfig | WebhookConfig => {
    switch (formType) {
      case "REST API":
        return { 
          apiUrl, 
          httpMethod, 
          dataPath,
          ...(apiKey && { apiKey }),
          ...(apiSecret && { apiSecret })
        };
      case "Database":
        return { host, port, databaseName, query };
      case "File":
        return { filePath, format: fileFormat };
      case "Webhook":
        return { webhookUrl, secret };
      default:
        return { apiUrl, httpMethod, dataPath };
    }
  };

  const handleEdit = (feed: Feed) => {
    setSelectedFeed(feed);
    loadFormData(feed);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedFeed) return;

    const updatedFeed: Feed = {
      ...selectedFeed,
      name: formName,
      type: formType,
      category: formCategory,
      active: formActive,
      configuration: buildConfiguration(),
    };

    onUpdateFeed(updatedFeed);
    setEditDialogOpen(false);
    resetForm();
  };

  const handleAdd = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const handleSaveAdd = () => {
    const newFeed: Feed = {
      id: `feed-${Date.now()}`,
      name: formName,
      type: formType,
      category: formCategory,
      active: formActive,
      configuration: buildConfiguration(),
      created: new Date().toISOString(),
    };

    onAddFeed(newFeed);
    setAddDialogOpen(false);
    resetForm();
  };

  const handleDelete = (feed: Feed) => {
    setSelectedFeed(feed);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedFeed) {
      onDeleteFeed(selectedFeed.id);
      setDeleteDialogOpen(false);
      setSelectedFeed(null);
    }
  };

  const handleRefresh = () => {
    console.log("Refreshing feeds...");
  };

  const handleRunFeed = (feed: Feed) => {
    console.log("Running feed:", feed.name);
    // In a real implementation, this would trigger the feed to run/execute
  };

  const getConfigurationSummary = (feed: Feed): string => {
    const config = feed.configuration;
    
    if (feed.type === "REST API" && "apiUrl" in config) {
      return `${config.httpMethod} ${config.apiUrl}`;
    } else if (feed.type === "Database" && "host" in config) {
      return `${config.host}:${config.port}/${config.databaseName}`;
    } else if (feed.type === "File" && "filePath" in config) {
      return `${config.filePath} (${config.format})`;
    } else if (feed.type === "Webhook" && "webhookUrl" in config) {
      return config.webhookUrl;
    }
    
    return "";
  };

  const renderConditionalFields = () => {
    switch (formType) {
      case "REST API":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="api-url">API URL *</Label>
              <Input
                id="api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.example.com/v1/data"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="http-method">HTTP Method</Label>
                <Select value={httpMethod} onValueChange={(value) => setHttpMethod(value as HttpMethod)}>
                  <SelectTrigger id="http-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="data-path">Data Path</Label>
                <Input
                  id="data-path"
                  value={dataPath}
                  onChange={(e) => setDataPath(e.target.value)}
                  placeholder="data.results"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="api-secret">API Secret</Label>
                <Input
                  id="api-secret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter API secret"
                />
              </div>
            </div>
          </>
        );
      
      case "Database":
        return (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="host">Host *</Label>
                <Input
                  id="host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="db.example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="5432"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="database-name">Database Name *</Label>
              <Input
                id="database-name"
                value={databaseName}
                onChange={(e) => setDatabaseName(e.target.value)}
                placeholder="production_db"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="query">Query *</Label>
              <Textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM table WHERE condition = true"
                rows={4}
              />
            </div>
          </>
        );
      
      case "File":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="file-path">File Path *</Label>
              <Input
                id="file-path"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="/data/imports/file.json"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="format">Format</Label>
              <Select value={fileFormat} onValueChange={(value) => setFileFormat(value as FileFormat)}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">json</SelectItem>
                  <SelectItem value="csv">csv</SelectItem>
                  <SelectItem value="xml">xml</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      
      case "Webhook":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="webhook-url">Webhook URL *</Label>
              <Input
                id="webhook-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://webhooks.example.com/endpoint"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secret">Secret</Label>
              <Input
                id="secret"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="whsec_..."
                type="password"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Rss className="w-8 h-8 text-orange-600" />
            Data Feeds
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage data sources and integration feeds
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated ({new Date(lastUpdated).toLocaleTimeString()})
        </div>
      </div>

      <FeedsFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        totalFeeds={feeds.length}
        filteredCount={filteredFeeds.length}
        onAddFeed={handleAdd}
        onRefresh={handleRefresh}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Configuration</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeeds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No feeds found
                </TableCell>
              </TableRow>
            ) : (
              filteredFeeds.map((feed) => (
                <TableRow key={feed.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(feed.type)}
                      <span>{feed.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{feed.type}</TableCell>
                  <TableCell>{feed.category}</TableCell>
                  <TableCell>
                    <Badge
                      variant={feed.active ? "default" : "secondary"}
                      className={
                        feed.active
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : ""
                      }
                    >
                      {feed.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground text-sm">
                    {getConfigurationSummary(feed)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(feed.created), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRunFeed(feed)}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(feed)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(feed)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Data Source</DialogTitle>
            <DialogDescription>
              Update the data source configuration and settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select value={formType} onValueChange={(value) => setFormType(value as FeedType)}>
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REST API">REST API</SelectItem>
                    <SelectItem value="Database">Database</SelectItem>
                    <SelectItem value="File">File</SelectItem>
                    <SelectItem value="Webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={formCategory} onValueChange={(value) => setFormCategory(value as FeedCategory)}>
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Elections">Elections</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Weather">Weather</SelectItem>
                    <SelectItem value="News">News</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="edit-active">Active</Label>
                <div className="text-sm text-muted-foreground">
                  Enable or disable this data source
                </div>
              </div>
              <Switch
                id="edit-active"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
            </div>
            {renderConditionalFields()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Data Source</DialogTitle>
            <DialogDescription>
              Configure a new data source for the Nova Dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter feed name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-type">Type</Label>
                <Select value={formType} onValueChange={(value) => setFormType(value as FeedType)}>
                  <SelectTrigger id="add-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REST API">REST API</SelectItem>
                    <SelectItem value="Database">Database</SelectItem>
                    <SelectItem value="File">File</SelectItem>
                    <SelectItem value="Webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-category">Category</Label>
                <Select value={formCategory} onValueChange={(value) => setFormCategory(value as FeedCategory)}>
                  <SelectTrigger id="add-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Elections">Elections</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Weather">Weather</SelectItem>
                    <SelectItem value="News">News</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="add-active">Active</Label>
                <div className="text-sm text-muted-foreground">
                  Enable or disable this data source
                </div>
              </div>
              <Switch
                id="add-active"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
            </div>
            {renderConditionalFields()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdd}>Add Data Source</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedFeed?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
