import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Enums } from "@/types";
import {
  SearchableCombobox,
  type ComboboxItem,
} from "@/components/SearchableCombobox";
import { useProjectSearch } from "@/hooks/useProjectSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Trophy } from "lucide-react";

interface AwardRow {
  id: string;
  award_body: string;
  category: string;
  project_id: string | null;
  project_title: string | null;
  result: Enums<"award_result">;
  year: number;
  status: Enums<"content_status">;
}

interface AwardListProps {
  clientId: string;
}

export function AwardList({ clientId }: AwardListProps) {
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<AwardRow>>({});
  const [addOpen, setAddOpen] = useState(false);

  const fetchAwards = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("awards")
      .select(`
        id,
        award_body,
        category,
        project_id,
        result,
        year,
        status,
        projects(title)
      `)
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("year", { ascending: false });

    if (error) {
      toast.error("Failed to load awards: " + error.message);
      setLoading(false);
      return;
    }

    const mapped: AwardRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      award_body: r.award_body,
      category: r.category,
      project_id: r.project_id,
      project_title: r.projects?.title ?? null,
      result: r.result,
      year: r.year,
      status: r.status,
    }));

    setAwards(mapped);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

  async function toggleStatus(id: string, current: Enums<"content_status">) {
    const next = current === "draft" ? "published" : "draft";
    const { error } = await supabase
      .from("awards")
      .update({ status: next })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status: " + error.message);
      return;
    }

    setAwards((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: next } : a)),
    );
    toast.success(`Award ${next === "published" ? "published" : "unpublished"}`);
  }

  function startEdit(award: AwardRow) {
    setEditingId(award.id);
    setEditDraft({ ...award });
  }

  async function saveEdit(id: string) {
    if (!editDraft.award_body || !editDraft.category || !editDraft.year) {
      toast.error("Award body, category, and year are required.");
      return;
    }

    const { error } = await supabase
      .from("awards")
      .update({
        award_body: editDraft.award_body,
        category: editDraft.category,
        result: editDraft.result as Enums<"award_result">,
        year: editDraft.year,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }

    setEditingId(null);
    setEditDraft({});
    toast.success("Award updated");
    fetchAwards();
  }

  async function deleteAward(id: string) {
    const { error } = await supabase
      .from("awards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete: " + error.message);
      return;
    }

    setAwards((prev) => prev.filter((a) => a.id !== id));
    setEditingId(null);
    toast.success("Award removed");
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
      <div className="flex justify-end">
        <AddAwardDialog
          clientId={clientId}
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={fetchAwards}
        />
      </div>

      {awards.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No awards yet. Click "Add award" to create the first entry.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {awards.map((award) => {
            const isEditing = editingId === award.id;

            return (
              <Card key={award.id}>
                <CardContent className="py-3">
                  {!isEditing ? (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
                          <span className="font-medium">{award.award_body}</span>
                          <span className="text-sm text-muted-foreground">
                            {award.year}
                          </span>
                          <Badge
                            variant={award.result === "Won" ? "default" : "secondary"}
                          >
                            {award.result}
                          </Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 pl-6 text-sm text-muted-foreground">
                          <span>{award.category}</span>
                          {award.project_title && (
                            <>
                              <span>·</span>
                              <span>{award.project_title}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Badge
                          variant={award.status === "published" ? "default" : "secondary"}
                        >
                          {award.status}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <Switch
                            id={`award-pub-${award.id}`}
                            checked={award.status === "published"}
                            onCheckedChange={() =>
                              toggleStatus(award.id, award.status)
                            }
                          />
                          <Label
                            htmlFor={`award-pub-${award.id}`}
                            className="cursor-pointer text-xs"
                          >
                            Publish
                          </Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEdit(award)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Award body *</Label>
                          <Input
                            value={editDraft.award_body ?? ""}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, award_body: e.target.value })
                            }
                            placeholder="e.g. BAFTA"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Category *</Label>
                          <Input
                            value={editDraft.category ?? ""}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, category: e.target.value })
                            }
                            placeholder="e.g. Best Original Score"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Result</Label>
                          <Select
                            value={editDraft.result ?? ""}
                            onValueChange={(v) =>
                              setEditDraft({
                                ...editDraft,
                                result: v as Enums<"award_result">,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Won">Won</SelectItem>
                              <SelectItem value="Nominated">Nominated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Year *</Label>
                          <Input
                            type="number"
                            value={editDraft.year ?? ""}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                year: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => saveEdit(award.id)}>
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
                          onClick={() => deleteAward(award.id)}
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

function AddAwardDialog({
  clientId,
  open,
  onOpenChange,
  onCreated,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [awardBody, setAwardBody] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState<Enums<"award_result">>("Nominated");
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedProject, setSelectedProject] = useState<ComboboxItem | null>(null);
  const [status, setStatus] = useState<Enums<"content_status">>("draft");
  const [saving, setSaving] = useState(false);
  const searchProjects = useProjectSearch();

  function reset() {
    setAwardBody("");
    setCategory("");
    setResult("Nominated");
    setYear(new Date().getFullYear());
    setSelectedProject(null);
    setStatus("draft");
  }

  async function handleSubmit() {
    if (!awardBody.trim() || !category.trim() || !year) {
      toast.error("Award body, category, and year are required.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("awards").insert({
      client_id: clientId,
      award_body: awardBody.trim(),
      category: category.trim(),
      result,
      year,
      project_id: selectedProject?.id ?? null,
      status,
      submitted_by: "admin" as Enums<"submitted_by_type">,
    });

    if (error) {
      toast.error("Failed to create award: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("Award added");
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
          Add award
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add award</DialogTitle>
          <DialogDescription>
            Record an award nomination or win for this client.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Award body *</Label>
              <Input
                value={awardBody}
                onChange={(e) => setAwardBody(e.target.value)}
                placeholder="e.g. BAFTA, Emmy, Tony Award"
              />
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Best Original Score"
              />
            </div>
            <div className="space-y-1">
              <Label>Result</Label>
              <Select value={result} onValueChange={(v) => setResult(v as Enums<"award_result">)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Won">Won</SelectItem>
                  <SelectItem value="Nominated">Nominated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Year *</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Linked project (optional)</Label>
              <SearchableCombobox
                onSearch={searchProjects}
                onSelect={setSelectedProject}
                value={selectedProject}
                placeholder="Search projects…"
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Enums<"content_status">)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : "Add award"}
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
