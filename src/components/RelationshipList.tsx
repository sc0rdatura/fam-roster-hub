import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Enums } from "@/types";
import {
  SearchableCombobox,
  type ComboboxItem,
} from "@/components/SearchableCombobox";
import { usePersonSearch } from "@/hooks/usePersonSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Search,
  Undo2,
  Film,
} from "lucide-react";

const HEAT_LEVELS: Enums<"heat_level">[] = [
  "Cold",
  "Warm",
  "Hot",
  "Direct Collaborator",
];

const HEAT_COLORS: Record<Enums<"heat_level">, string> = {
  Cold: "bg-blue-100 text-blue-800",
  Warm: "bg-yellow-100 text-yellow-800",
  Hot: "bg-orange-100 text-orange-800",
  "Direct Collaborator": "bg-green-100 text-green-800",
};

type SortKey = "name" | "heat" | "updated" | "last_contact";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name A–Z" },
  { value: "heat", label: "Heat level" },
  { value: "updated", label: "Recently updated" },
  { value: "last_contact", label: "Last contact" },
];

const HEAT_ORDER: Record<string, number> = {
  "Direct Collaborator": 0,
  Hot: 1,
  Warm: 2,
  Cold: 3,
};

interface LinkedProject {
  title: string;
  category: string;
  role: string;
}

interface RelationshipRow {
  id: string;
  client_id: string;
  client_name: string;
  person_id: string;
  person_name: string;
  person_primary_role: string | null;
  heat_level: Enums<"heat_level"> | null;
  relationship_type: string | null;
  how_we_met: string | null;
  notes: string | null;
  last_contact_date: string | null;
  follow_up_reminder: string | null;
  created_from_credit: boolean;
  email: string | null;
  phone: string | null;
  agent_rep_info: string | null;
  updated_at: string;
  deleted_at: string | null;
}

interface RelationshipListProps {
  clientId?: string;
}

export function RelationshipList({ clientId }: RelationshipListProps) {
  const [rows, setRows] = useState<RelationshipRow[]>([]);
  const [removedRows, setRemovedRows] = useState<RelationshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [heatFilter, setHeatFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<
    Map<string, LinkedProject[]>
  >(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<RelationshipRow>>({});
  const [showRemoved, setShowRemoved] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const searchPeople = usePersonSearch();

  const fetchRelationships = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("relationships")
      .select(`
        id,
        client_id,
        person_id,
        heat_level,
        relationship_type,
        how_we_met,
        notes,
        last_contact_date,
        follow_up_reminder,
        created_from_credit,
        email,
        phone,
        agent_rep_info,
        updated_at,
        deleted_at,
        clients!inner(full_name),
        people!inner(full_name, primary_role)
      `)
      .order("updated_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load relationships: " + error.message);
      setLoading(false);
      return;
    }

    const mapped: RelationshipRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      client_id: r.client_id,
      client_name: r.clients.full_name,
      person_id: r.person_id,
      person_name: r.people.full_name,
      person_primary_role: r.people.primary_role,
      heat_level: r.heat_level,
      relationship_type: r.relationship_type,
      how_we_met: r.how_we_met,
      notes: r.notes,
      last_contact_date: r.last_contact_date,
      follow_up_reminder: r.follow_up_reminder,
      created_from_credit: r.created_from_credit,
      email: r.email,
      phone: r.phone,
      agent_rep_info: r.agent_rep_info,
      updated_at: r.updated_at,
      deleted_at: r.deleted_at,
    }));

    setRows(mapped.filter((r) => !r.deleted_at));
    setRemovedRows(mapped.filter((r) => r.deleted_at));
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  async function fetchLinkedProjects(row: RelationshipRow) {
    if (expandedProjects.has(row.id)) return;

    // Get project IDs where this person is involved
    const { data: ppData } = await supabase
      .from("project_people")
      .select("project_id")
      .eq("person_id", row.person_id);

    const personProjectIds = new Set((ppData ?? []).map((pp) => pp.project_id));

    if (personProjectIds.size === 0) {
      setExpandedProjects((prev) => new Map(prev).set(row.id, []));
      return;
    }

    // Get the client's credits on those projects
    const { data: creditData } = await supabase
      .from("credits")
      .select(`
        role,
        project_id,
        projects!inner(title, category)
      `)
      .eq("client_id", row.client_id)
      .in("project_id", [...personProjectIds])
      .is("deleted_at", null);

    const projects: LinkedProject[] = (creditData ?? []).map((c: any) => ({
      title: c.projects.title,
      category: c.projects.category,
      role: c.role,
    }));

    setExpandedProjects((prev) => new Map(prev).set(row.id, projects));
  }

  function toggleExpand(row: RelationshipRow) {
    if (expandedId === row.id) {
      setExpandedId(null);
    } else {
      setExpandedId(row.id);
      fetchLinkedProjects(row);
      // On global page, also fetch projects for all other rows with the same person
      if (!clientId) {
        for (const r of rows) {
          if (r.person_id === row.person_id && r.id !== row.id) {
            fetchLinkedProjects(r);
          }
        }
      }
    }
  }

  function startEdit(row: RelationshipRow) {
    setEditingId(row.id);
    setExpandedId(row.id);
    setEditDraft({
      heat_level: row.heat_level,
      relationship_type: row.relationship_type,
      how_we_met: row.how_we_met,
      notes: row.notes,
      last_contact_date: row.last_contact_date,
      follow_up_reminder: row.follow_up_reminder,
      email: row.email,
      phone: row.phone,
      agent_rep_info: row.agent_rep_info,
    });
  }

  async function saveEdit(id: string) {
    const { error } = await supabase
      .from("relationships")
      .update({
        heat_level: (editDraft.heat_level as Enums<"heat_level">) || null,
        relationship_type: editDraft.relationship_type || null,
        how_we_met: editDraft.how_we_met || null,
        notes: editDraft.notes || null,
        last_contact_date: editDraft.last_contact_date || null,
        follow_up_reminder: editDraft.follow_up_reminder || null,
        email: editDraft.email || null,
        phone: editDraft.phone || null,
        agent_rep_info: editDraft.agent_rep_info || null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }

    setEditingId(null);
    setEditDraft({});
    toast.success("Relationship updated");
    fetchRelationships();
  }

  async function removeRelationship(row: RelationshipRow) {
    const { error } = await supabase
      .from("relationships")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", row.id);

    if (error) {
      toast.error("Failed to remove: " + error.message);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setRemovedRows((prev) => [...prev, { ...row, deleted_at: new Date().toISOString() }]);
    setEditingId(null);

    toast("Relationship removed", {
      action: {
        label: "Undo",
        onClick: () => restoreRelationship(row.id),
      },
    });
  }

  async function restoreRelationship(id: string) {
    const { error } = await supabase
      .from("relationships")
      .update({ deleted_at: null })
      .eq("id", id);

    if (error) {
      toast.error("Failed to restore: " + error.message);
      return;
    }

    toast.success("Relationship restored");
    fetchRelationships();
  }

  // Filtering
  let filtered = rows;
  if (heatFilter !== "all") {
    filtered = filtered.filter((r) => r.heat_level === heatFilter);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.person_name.toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q) ||
        (r.relationship_type ?? "").toLowerCase().includes(q) ||
        (r.client_name ?? "").toLowerCase().includes(q),
    );
  }

  // Sorting
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.person_name.localeCompare(b.person_name);
      case "heat":
        return (
          (HEAT_ORDER[a.heat_level ?? ""] ?? 99) -
          (HEAT_ORDER[b.heat_level ?? ""] ?? 99)
        );
      case "updated":
        return b.updated_at.localeCompare(a.updated_at);
      case "last_contact": {
        const da = a.last_contact_date ?? "";
        const db = b.last_contact_date ?? "";
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
      }
      default:
        return 0;
    }
  });

  // Heat level counts for summary
  const heatCounts = new Map<string, number>();
  for (const r of rows) {
    const h = r.heat_level ?? "Unset";
    heatCounts.set(h, (heatCounts.get(h) ?? 0) + 1);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {HEAT_LEVELS.map((h) => {
            const count = heatCounts.get(h) ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setHeatFilter(heatFilter === h ? "all" : h)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-opacity ${
                  HEAT_COLORS[h]
                } ${heatFilter !== "all" && heatFilter !== h ? "opacity-40" : ""}`}
              >
                {h}
                <span className="font-bold">{count}</span>
              </button>
            );
          })}
          {(heatFilter !== "all" || searchQuery.trim()) && (
            <button
              type="button"
              className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setHeatFilter("all");
                setSearchQuery("");
              }}
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto self-center text-xs text-muted-foreground">
            {filtered.length === rows.length
              ? `${rows.length} total`
              : `${filtered.length} of ${rows.length}`}
          </span>
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, notes, type…"
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {clientId && (
          <AddRelationshipDialog
            clientId={clientId}
            open={addOpen}
            onOpenChange={setAddOpen}
            searchPeople={searchPeople}
            onCreated={fetchRelationships}
          />
        )}
      </div>

      {/* Main list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {rows.length === 0
              ? "No relationships yet. Publish a credit to auto-create them, or add one manually."
              : "No relationships match your search or filter."}
          </CardContent>
        </Card>
      ) : !clientId ? (
        <GlobalGroupedView
          filtered={filtered}
          sortBy={sortBy}
          expandedId={expandedId}
          editingId={editingId}
          editDraft={editDraft}
          expandedProjects={expandedProjects}
          toggleExpand={toggleExpand}
          startEdit={startEdit}
          saveEdit={saveEdit}
          removeRelationship={removeRelationship}
          setEditingId={setEditingId}
          setEditDraft={setEditDraft}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((row, idx) => {
            const showLetterHeader =
              sortBy === "name" &&
              (idx === 0 ||
                filtered[idx - 1].person_name[0].toUpperCase() !==
                  row.person_name[0].toUpperCase());
            const isExpanded = expandedId === row.id;
            const isEditing = editingId === row.id;
            const projects = expandedProjects.get(row.id);
            const hasDetails =
              row.relationship_type ||
              row.how_we_met ||
              row.email ||
              row.phone ||
              row.agent_rep_info ||
              row.last_contact_date;

            return (
              <div key={row.id}>
                {showLetterHeader && (
                  <div className="sticky top-0 z-10 -mx-1 mb-1 mt-3 first:mt-0 bg-background px-1 py-1">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      {row.person_name[0].toUpperCase()}
                    </span>
                  </div>
                )}
              <Card>
                <CardContent className="py-3">
                  {/* Header row */}
                  <div
                    className="flex cursor-pointer items-center justify-between gap-3"
                    onClick={() => {
                      if (!isEditing) toggleExpand(row);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.person_name}</span>
                        {row.person_primary_role && (
                          <span className="text-sm text-muted-foreground">
                            ({row.person_primary_role})
                          </span>
                        )}
                        {row.heat_level && (
                          <Badge
                            variant="outline"
                            className={HEAT_COLORS[row.heat_level]}
                          >
                            {row.heat_level}
                          </Badge>
                        )}
                        {row.created_from_credit && (
                          <Badge variant="outline" className="text-xs">
                            via credit
                          </Badge>
                        )}
                      </div>
                      {!clientId && (
                        <span className="text-xs text-muted-foreground">
                          Client: {row.client_name}
                        </span>
                      )}
                      {row.notes && (
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                          {row.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(row);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                      <div className="h-7 w-7 flex items-center justify-center text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded read-only details */}
                  {isExpanded && !isEditing && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                      {/* Linked projects */}
                      {projects && projects.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Shared projects
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {projects.map((p, i) => (
                              <Badge key={i} variant="secondary" className="gap-1 text-xs">
                                <Film className="h-3 w-3" />
                                {p.title}
                                <span className="text-muted-foreground">
                                  ({p.category})
                                </span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {projects && projects.length === 0 && row.created_from_credit && (
                        <p className="text-xs text-muted-foreground italic">
                          Created from credit but no shared projects found.
                        </p>
                      )}

                      {/* Contact & metadata details */}
                      {hasDetails && (
                        <div className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                          {row.relationship_type && (
                            <DetailItem label="Type" value={row.relationship_type} />
                          )}
                          {row.how_we_met && (
                            <DetailItem label="How we met" value={row.how_we_met} />
                          )}
                          {row.email && (
                            <DetailItem label="Email" value={row.email} />
                          )}
                          {row.phone && (
                            <DetailItem label="Phone" value={row.phone} />
                          )}
                          {row.agent_rep_info && (
                            <DetailItem label="Agent/rep" value={row.agent_rep_info} />
                          )}
                          {row.last_contact_date && (
                            <DetailItem
                              label="Last contact"
                              value={row.last_contact_date}
                            />
                          )}
                        </div>
                      )}

                      {!hasDetails && (!projects || projects.length === 0) && !row.created_from_credit && (
                        <p className="text-xs text-muted-foreground italic">
                          No additional details. Click Edit to add more info.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Edit form */}
                  {isEditing && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Heat level</Label>
                          <Select
                            value={editDraft.heat_level ?? ""}
                            onValueChange={(v) =>
                              setEditDraft({
                                ...editDraft,
                                heat_level: v as Enums<"heat_level">,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              {HEAT_LEVELS.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Notes</Label>
                          <Input
                            value={editDraft.notes ?? ""}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, notes: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Relationship type</Label>
                          <Input
                            value={editDraft.relationship_type ?? ""}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                relationship_type: e.target.value,
                              })
                            }
                            placeholder="e.g. Former colleague"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">How we met</Label>
                          <Input
                            value={editDraft.how_we_met ?? ""}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                how_we_met: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Email</Label>
                          <Input
                            value={editDraft.email ?? ""}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, email: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Phone</Label>
                          <Input
                            value={editDraft.phone ?? ""}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, phone: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Agent/rep info</Label>
                          <Input
                            value={editDraft.agent_rep_info ?? ""}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                agent_rep_info: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Last contact date</Label>
                          <Input
                            type="date"
                            value={editDraft.last_contact_date ?? ""}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                last_contact_date: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => saveEdit(row.id)}>
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
                          onClick={() => removeRelationship(row)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Removed relationships section */}
      {removedRows.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowRemoved(!showRemoved)}
          >
            {showRemoved ? "Hide" : "Show"} removed ({removedRows.length})
          </button>
          {showRemoved && (
            <div className="mt-2 space-y-1.5">
              {removedRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 opacity-60"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="line-through">{row.person_name}</span>
                    {row.heat_level && (
                      <Badge variant="outline" className="text-xs">
                        {row.heat_level}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => restoreRelationship(row.id)}
                  >
                    <Undo2 className="mr-1 h-3.5 w-3.5" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

interface GlobalGroupedViewProps {
  filtered: RelationshipRow[];
  sortBy: SortKey;
  expandedId: string | null;
  editingId: string | null;
  editDraft: Partial<RelationshipRow>;
  expandedProjects: Map<string, LinkedProject[]>;
  toggleExpand: (row: RelationshipRow) => void;
  startEdit: (row: RelationshipRow) => void;
  saveEdit: (id: string) => void;
  removeRelationship: (row: RelationshipRow) => void;
  setEditingId: (id: string | null) => void;
  setEditDraft: (d: Partial<RelationshipRow>) => void;
}

function GlobalGroupedView({
  filtered,
  sortBy,
  expandedId,
  editingId,
  editDraft,
  expandedProjects,
  toggleExpand,
  startEdit,
  saveEdit,
  removeRelationship,
  setEditingId,
  setEditDraft,
}: GlobalGroupedViewProps) {
  // Group by person
  const grouped = new Map<
    string,
    { personName: string; primaryRole: string | null; rows: RelationshipRow[] }
  >();
  for (const row of filtered) {
    if (!grouped.has(row.person_id)) {
      grouped.set(row.person_id, {
        personName: row.person_name,
        primaryRole: row.person_primary_role,
        rows: [],
      });
    }
    grouped.get(row.person_id)!.rows.push(row);
  }

  const groups = [...grouped.values()].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.personName.localeCompare(b.personName);
      case "heat": {
        const ha = a.rows.reduce<number>(
          (best, r) => Math.min(best, HEAT_ORDER[r.heat_level ?? ""] ?? 99),
          99,
        );
        const hb = b.rows.reduce<number>(
          (best, r) => Math.min(best, HEAT_ORDER[r.heat_level ?? ""] ?? 99),
          99,
        );
        return ha - hb;
      }
      case "updated":
        return b.rows[0].updated_at.localeCompare(a.rows[0].updated_at);
      case "last_contact": {
        const da = a.rows.reduce(
          (best, r) => (r.last_contact_date && r.last_contact_date > best ? r.last_contact_date : best),
          "",
        );
        const db = b.rows.reduce(
          (best, r) => (r.last_contact_date && r.last_contact_date > best ? r.last_contact_date : best),
          "",
        );
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
      }
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-2">
      {groups.map((group, idx) => {
        const showLetterHeader =
          sortBy === "name" &&
          (idx === 0 ||
            groups[idx - 1].personName[0].toUpperCase() !==
              group.personName[0].toUpperCase());
        const multiClient = group.rows.length > 1;
        const firstRow = group.rows[0];
        const isExpanded = group.rows.some((r) => expandedId === r.id);
        const expandTarget = isExpanded
          ? group.rows.find((r) => expandedId === r.id)!
          : firstRow;

        // Highest heat level across all clients
        const bestHeat = group.rows.reduce<Enums<"heat_level"> | null>(
          (best, r) => {
            if (!r.heat_level) return best;
            if (!best) return r.heat_level;
            return (HEAT_ORDER[r.heat_level] ?? 99) <
              (HEAT_ORDER[best] ?? 99)
              ? r.heat_level
              : best;
          },
          null,
        );

        return (
          <div key={group.rows.map((r) => r.id).join("-")}>
            {showLetterHeader && (
              <div className="sticky top-0 z-10 -mx-1 mb-1 mt-3 first:mt-0 bg-background px-1 py-1">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  {group.personName[0].toUpperCase()}
                </span>
              </div>
            )}
          <Card>
            <CardContent className="py-3">
              <div
                className="flex cursor-pointer items-center justify-between gap-3"
                onClick={() => toggleExpand(expandTarget)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{group.personName}</span>
                    {group.primaryRole && (
                      <span className="text-sm text-muted-foreground">
                        ({group.primaryRole})
                      </span>
                    )}
                    {bestHeat && (
                      <Badge
                        variant="outline"
                        className={HEAT_COLORS[bestHeat]}
                      >
                        {bestHeat}
                      </Badge>
                    )}
                    {multiClient && (
                      <Badge variant="secondary" className="text-xs">
                        {group.rows.length} clients
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {group.rows.map((r) => r.client_name).join(", ")}
                  </span>
                </div>
                <div className="h-7 w-7 flex items-center justify-center text-muted-foreground">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>

              {isExpanded && (() => {
                // Collect person-level contact details from any row in the group
                const email = group.rows.find((r) => r.email)?.email;
                const phone = group.rows.find((r) => r.phone)?.phone;
                const agentRep = group.rows.find((r) => r.agent_rep_info)?.agent_rep_info;
                const hasContactDetails = email || phone || agentRep;

                return (
                <div className="mt-3 space-y-3 border-t pt-3">
                  {/* Person-level contact details */}
                  {hasContactDetails && (
                    <div className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
                      {email && <DetailItem label="Email" value={email} />}
                      {phone && <DetailItem label="Phone" value={phone} />}
                      {agentRep && <DetailItem label="Agent/rep" value={agentRep} />}
                    </div>
                  )}

                  {/* Per-client relationship cards */}
                  {group.rows.map((row) => {
                    const isEditing = editingId === row.id;
                    const projects = expandedProjects.get(row.id);

                    return (
                      <div
                        key={row.id}
                        className="rounded-md border bg-muted/20 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {row.client_name}
                            </span>
                            {row.heat_level && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${HEAT_COLORS[row.heat_level]}`}
                              >
                                {row.heat_level}
                              </Badge>
                            )}
                            {row.created_from_credit && (
                              <Badge variant="outline" className="text-xs">
                                via credit
                              </Badge>
                            )}
                          </div>
                          {!isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(row);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                        {!isEditing && row.notes && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {row.notes}
                          </p>
                        )}

                        {/* Shared projects */}
                        {!isEditing && projects && projects.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1.5">
                              {projects.map((p, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="gap-1 text-xs"
                                >
                                  <Film className="h-3 w-3" />
                                  {p.title}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Read-only relationship details (contact details shown at group level) */}
                        {!isEditing && (row.relationship_type || row.how_we_met || row.last_contact_date) && (
                          <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                            {row.relationship_type && (
                              <DetailItem
                                label="Type"
                                value={row.relationship_type}
                              />
                            )}
                            {row.how_we_met && (
                              <DetailItem label="How we met" value={row.how_we_met} />
                            )}
                            {row.last_contact_date && (
                              <DetailItem
                                label="Last contact"
                                value={row.last_contact_date}
                              />
                            )}
                          </div>
                        )}

                        {/* Edit form */}
                        {isEditing && (
                          <div className="mt-2 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Heat level</Label>
                                <Select
                                  value={editDraft.heat_level ?? ""}
                                  onValueChange={(v) =>
                                    setEditDraft({
                                      ...editDraft,
                                      heat_level: v as Enums<"heat_level">,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {HEAT_LEVELS.map((h) => (
                                      <SelectItem key={h} value={h}>
                                        {h}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Notes</Label>
                                <Input
                                  value={editDraft.notes ?? ""}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      notes: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEdit(row.id)}
                              >
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
                                onClick={() => removeRelationship(row)}
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </CardContent>
          </Card>
          </div>
        );
      })}
    </div>
  );
}

function AddRelationshipDialog({
  clientId,
  open,
  onOpenChange,
  searchPeople,
  onCreated,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  searchPeople: (q: string) => Promise<ComboboxItem[]>;
  onCreated: () => void;
}) {
  const [selectedPerson, setSelectedPerson] = useState<ComboboxItem | null>(
    null,
  );
  const [heatLevel, setHeatLevel] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setSelectedPerson(null);
    setHeatLevel("");
    setNotes("");
  }

  async function handleSubmit() {
    if (!selectedPerson) {
      toast.error("Please select a person.");
      return;
    }
    setSaving(true);

    const { error } = await supabase.from("relationships").insert({
      client_id: clientId,
      person_id: selectedPerson.id,
      heat_level: (heatLevel as Enums<"heat_level">) || null,
      notes: notes || null,
      created_from_credit: false,
    });

    if (error) {
      if (
        error.message.includes("duplicate") ||
        error.message.includes("unique")
      ) {
        toast.error("A relationship with this person already exists.");
      } else {
        toast.error("Failed to create: " + error.message);
      }
      setSaving(false);
      return;
    }

    toast.success("Relationship added");
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
          Add relationship
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add relationship</DialogTitle>
          <DialogDescription>
            Search for an existing person to create a relationship record.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Person *</Label>
            <SearchableCombobox
              onSearch={searchPeople}
              onSelect={setSelectedPerson}
              value={selectedPerson}
              placeholder="Search people…"
            />
          </div>
          <div className="space-y-1">
            <Label>Heat level</Label>
            <Select value={heatLevel} onValueChange={setHeatLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {HEAT_LEVELS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : "Add"}
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
