import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Video,
} from "lucide-react";

interface ReelRow {
  id: string;
  genre_label: string;
  url: string;
  notes: string | null;
  display_order: number;
}

interface ReelListProps {
  clientId: string;
}

export function ReelList({ clientId }: ReelListProps) {
  const [reels, setReels] = useState<ReelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ReelRow>>({});
  const [addOpen, setAddOpen] = useState(false);

  const fetchReels = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reels")
      .select("id, genre_label, url, notes, display_order")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Failed to load reels: " + error.message);
      setLoading(false);
      return;
    }

    setReels(data ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  async function moveReel(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= reels.length) return;

    const updated = [...reels];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];

    const reordered = updated.map((r, i) => ({ ...r, display_order: i + 1 }));
    setReels(reordered);

    const promises = reordered.map((r) =>
      supabase.from("reels").update({ display_order: r.display_order }).eq("id", r.id),
    );

    const results = await Promise.all(promises);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error("Failed to reorder: " + failed.error.message);
      fetchReels();
    }
  }

  function startEdit(reel: ReelRow) {
    setEditingId(reel.id);
    setEditDraft({ ...reel });
  }

  async function saveEdit(id: string) {
    if (!editDraft.genre_label || !editDraft.url) {
      toast.error("Genre label and URL are required.");
      return;
    }

    const { error } = await supabase
      .from("reels")
      .update({
        genre_label: editDraft.genre_label,
        url: editDraft.url,
        notes: editDraft.notes || null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }

    setEditingId(null);
    setEditDraft({});
    toast.success("Reel updated");
    fetchReels();
  }

  async function deleteReel(id: string) {
    const { error } = await supabase
      .from("reels")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete: " + error.message);
      return;
    }

    setReels((prev) => prev.filter((r) => r.id !== id));
    setEditingId(null);
    toast.success("Reel removed");
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reels.length} reel{reels.length !== 1 ? "s" : ""} — use arrows to
          reorder
        </p>
        <AddReelDialog
          clientId={clientId}
          nextOrder={reels.length + 1}
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={fetchReels}
        />
      </div>

      {reels.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No reels yet. Click "Add reel" to create the first entry.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reels.map((reel, index) => {
            const isEditing = editingId === reel.id;

            return (
              <Card key={reel.id}>
                <CardContent className="py-3">
                  {!isEditing ? (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={index === 0}
                            onClick={() => moveReel(index, "up")}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={index === reels.length - 1}
                            onClick={() => moveReel(index, "down")}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <Video className="h-4 w-4 shrink-0 text-blue-500" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {reel.genre_label}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              #{reel.display_order}
                            </Badge>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                            <a
                              href={reel.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {reel.url.length > 50
                                ? reel.url.slice(0, 50) + "…"
                                : reel.url}
                            </a>
                          </div>
                          {reel.notes && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {reel.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => startEdit(reel)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Genre label *</Label>
                          <Input
                            value={editDraft.genre_label ?? ""}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                genre_label: e.target.value,
                              })
                            }
                            placeholder="e.g. Drama, Documentary"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">URL *</Label>
                          <Input
                            value={editDraft.url ?? ""}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, url: e.target.value })
                            }
                            placeholder="https://vimeo.com/..."
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Notes (optional)</Label>
                          <Input
                            value={editDraft.notes ?? ""}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                notes: e.target.value,
                              })
                            }
                            placeholder="Any additional notes"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => saveEdit(reel.id)}>
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditDraft({});
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-destructive hover:text-destructive"
                          onClick={() => deleteReel(reel.id)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddReelDialog({
  clientId,
  nextOrder,
  open,
  onOpenChange,
  onCreated,
}: {
  clientId: string;
  nextOrder: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [genreLabel, setGenreLabel] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setGenreLabel("");
    setUrl("");
    setNotes("");
  }

  async function handleSubmit() {
    if (!genreLabel.trim() || !url.trim()) {
      toast.error("Genre label and URL are required.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("reels").insert({
      client_id: clientId,
      genre_label: genreLabel.trim(),
      url: url.trim(),
      notes: notes.trim() || null,
      display_order: nextOrder,
    });

    if (error) {
      toast.error("Failed to create reel: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("Reel added");
    reset();
    onOpenChange(false);
    onCreated();
    setSaving(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add reel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add reel</DialogTitle>
          <DialogDescription>
            Add a showreel link for this client. It will appear at the end of the
            list.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Genre label *</Label>
            <Input
              value={genreLabel}
              onChange={(e) => setGenreLabel(e.target.value)}
              placeholder="e.g. Drama, Documentary, Action"
            />
          </div>
          <div className="space-y-1">
            <Label>URL *</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://vimeo.com/..."
            />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : "Add reel"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
