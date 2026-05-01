import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Enums } from "@/types";
import { useLookupTable } from "@/hooks/useLookupTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const CATEGORY_ORDER: Enums<"project_category">[] = [
  "Film",
  "TV",
  "Games",
  "Theatre",
  "Other",
];

interface CreditWithProject {
  id: string;
  role: string;
  status: Enums<"content_status">;
  internal_notes: string | null;
  submitted_by: string;
  created_at: string;
  project: {
    id: string;
    title: string;
    category: Enums<"project_category">;
    sub_type: string | null;
    year_start: number | null;
    year_end: number | null;
    status: Enums<"project_status"> | null;
  };
}

function formatYear(
  yearStart: number | null,
  yearEnd: number | null,
  status: Enums<"project_status"> | null,
): string {
  if (yearStart && yearEnd) {
    return yearStart === yearEnd ? `${yearStart}` : `${yearStart}–${yearEnd}`;
  }
  if (yearStart) return `${yearStart}`;
  if (!yearStart && !yearEnd && status === "In Production") return "In Production";
  return "";
}

interface CreditListProps {
  clientId: string;
  refreshKey: number;
}

export function CreditList({ clientId, refreshKey }: CreditListProps) {
  const [credits, setCredits] = useState<CreditWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { rows: subtypes } = useLookupTable("project_subtypes");
  const { rows: creditRoles } = useLookupTable("credit_roles");

  const fetchCredits = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("credits")
      .select(`
        id,
        role,
        status,
        internal_notes,
        submitted_by,
        created_at,
        projects!inner (
          id,
          title,
          category,
          sub_type,
          year_start,
          year_end,
          status
        )
      `)
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load credits: " + error.message);
      setLoading(false);
      return;
    }

    const mapped: CreditWithProject[] = (data ?? []).map((row: any) => ({
      id: row.id,
      role: row.role,
      status: row.status,
      internal_notes: row.internal_notes,
      submitted_by: row.submitted_by,
      created_at: row.created_at,
      project: row.projects,
    }));

    setCredits(mapped);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits, refreshKey]);

  async function toggleStatus(creditId: string, current: Enums<"content_status">) {
    const next = current === "draft" ? "published" : "draft";

    const { error } = await supabase
      .from("credits")
      .update({ status: next })
      .eq("id", creditId);

    if (error) {
      toast.error("Failed to update status: " + error.message);
      return;
    }

    setCredits((prev) =>
      prev.map((c) => (c.id === creditId ? { ...c, status: next } : c)),
    );

    if (next === "published") {
      const { error: rpcError } = await supabase.rpc("auto_create_relationships", {
        p_credit_id: creditId,
      });
      if (rpcError) {
        toast.warning("Credit published, but relationship sync failed: " + rpcError.message);
      } else {
        toast.success("Credit published — relationships updated");
      }
    } else {
      toast.success("Credit unpublished");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (credits.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No credits yet. Use "Add credit" above to create the first entry.
        </CardContent>
      </Card>
    );
  }

  const grouped = new Map<Enums<"project_category">, CreditWithProject[]>();
  for (const credit of credits) {
    const cat = credit.project.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(credit);
  }

  for (const [, list] of grouped) {
    list.sort((a, b) => {
      const ya = a.project.year_start ?? 0;
      const yb = b.project.year_start ?? 0;
      return yb - ya;
    });
  }

  const orderedCategories = CATEGORY_ORDER.filter((cat) => grouped.has(cat));

  return (
    <div className="space-y-6">
      {orderedCategories.map((category) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base uppercase tracking-wide">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {grouped.get(category)!.map((credit) => {
                const yearStr = formatYear(
                  credit.project.year_start,
                  credit.project.year_end,
                  credit.project.status,
                );
                const subType = credit.project.sub_type
                  ? subtypes.find((s) => s.value === credit.project.sub_type)?.display_label ?? credit.project.sub_type
                  : null;

                return (
                  <div
                    key={credit.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{credit.project.title}</span>
                        {subType && (
                          <span className="text-xs text-muted-foreground">
                            ({subType})
                          </span>
                        )}
                        {yearStr && (
                          <span className="text-sm text-muted-foreground">
                            {yearStr}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{creditRoles.find((r) => r.value === credit.role)?.display_label ?? credit.role}</span>
                        {credit.internal_notes && (
                          <span
                            className="max-w-[200px] truncate text-xs italic"
                            title={credit.internal_notes}
                          >
                            — {credit.internal_notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <Badge
                        variant={credit.status === "published" ? "default" : "secondary"}
                      >
                        {credit.status}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          id={`publish-${credit.id}`}
                          checked={credit.status === "published"}
                          onCheckedChange={() => toggleStatus(credit.id, credit.status)}
                        />
                        <Label
                          htmlFor={`publish-${credit.id}`}
                          className="cursor-pointer text-xs"
                        >
                          Publish
                        </Label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
