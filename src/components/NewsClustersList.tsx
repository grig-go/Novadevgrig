import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useClusters } from "../utils/useClusters";
import { Cluster } from "../types/clusters";
import { toast } from "sonner@2.0.3";
import { Sparkles, Plus, Edit2, Trash2, Loader2 } from "lucide-react";

export function NewsClustersList() {
  console.log('🟣 NewsClustersList component rendering');
  const { clusters, stats, loading, createCluster, updateCluster, deleteCluster } = useClusters();
  console.log('🟣 NewsClustersList - clusters:', clusters);
  console.log('🟣 NewsClustersList - stats:', stats);
  console.log('🟣 NewsClustersList - loading:', loading);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [articleIds, setArticleIds] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setKeywords("");
    setCategory("");
    setSentiment("");
    setArticleIds("");
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      await createCluster({
        title,
        description: description || undefined,
        keywords: keywords ? keywords.split(",").map(k => k.trim()) : [],
        category: category || undefined,
        sentiment: sentiment || undefined,
        article_ids: articleIds ? articleIds.split(",").map(id => id.trim()) : [],
      });

      toast.success("Cluster created");
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      toast.error("Failed to create cluster");
    }
  };

  const handleEdit = async () => {
    if (!editingCluster) return;

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      await updateCluster(editingCluster.id, {
        title,
        description: description || null,
        keywords: keywords ? keywords.split(",").map(k => k.trim()) : [],
        category: category || null,
        sentiment: sentiment || null,
        article_ids: articleIds ? articleIds.split(",").map(id => id.trim()) : [],
      });

      toast.success("Cluster updated");
      setIsEditOpen(false);
      setEditingCluster(null);
      resetForm();
    } catch (err) {
      toast.error("Failed to update cluster");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cluster?")) return;

    try {
      await deleteCluster(id);
      toast.success("Cluster deleted");
    } catch (err) {
      toast.error("Failed to delete cluster");
    }
  };

  const openEdit = (cluster: Cluster) => {
    setEditingCluster(cluster);
    setTitle(cluster.title);
    setDescription(cluster.description || "");
    setKeywords(cluster.keywords?.join(", ") || "");
    setCategory(cluster.category || "");
    setSentiment(cluster.sentiment || "");
    setArticleIds(cluster.article_ids?.join(", ") || "");
    setIsEditOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-purple-600" />
              <CardTitle>News Clusters</CardTitle>
              {stats && (
                <Badge variant="secondary">
                  {stats.totalClusters}
                </Badge>
              )}
            </div>
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="size-4 mr-2" />
              Add Cluster
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : clusters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No clusters yet</p>
              <p className="text-xs">Create your first cluster to organize news articles</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead className="text-right">Articles</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clusters.slice(0, 5).map((cluster) => (
                  <TableRow key={cluster.id}>
                    <TableCell>
                      <div>
                        <div>{cluster.title}</div>
                        {cluster.description && (
                          <div className="text-xs text-muted-foreground">
                            {cluster.description.slice(0, 40)}
                            {cluster.description.length > 40 && "..."}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cluster.category ? (
                        <Badge variant="secondary" className="text-xs">
                          {cluster.category}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cluster.keywords && cluster.keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cluster.keywords.slice(0, 2).map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {cluster.keywords.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{cluster.keywords.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {cluster.article_count}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(cluster)}
                        >
                          <Edit2 className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cluster.id)}
                        >
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Cluster</DialogTitle>
            <DialogDescription>Create a new cluster to group news articles</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Cluster title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
                rows={2}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Politics"
                />
              </div>
              <div className="space-y-2">
                <Label>Sentiment</Label>
                <Select value={sentiment} onValueChange={setSentiment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Keywords (comma-separated)</Label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., climate, environment"
              />
            </div>
            <div className="space-y-2">
              <Label>Article IDs (comma-separated)</Label>
              <Textarea
                value={articleIds}
                onChange={(e) => setArticleIds(e.target.value)}
                placeholder="e.g., article-1, article-2"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Cluster</DialogTitle>
            <DialogDescription>Update cluster information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Sentiment</Label>
                <Select value={sentiment} onValueChange={setSentiment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Keywords (comma-separated)</Label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Article IDs (comma-separated)</Label>
              <Textarea
                value={articleIds}
                onChange={(e) => setArticleIds(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditOpen(false);
              setEditingCluster(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}