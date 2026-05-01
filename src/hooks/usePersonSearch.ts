import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { ComboboxItem } from "@/components/SearchableCombobox";

export function usePersonSearch() {
  const search = useCallback(async (query: string): Promise<ComboboxItem[]> => {
    const { data, error } = await supabase
      .from("people")
      .select("id, full_name, primary_role")
      .is("deleted_at", null)
      .ilike("full_name", `%${query}%`)
      .order("full_name")
      .limit(20);

    if (error || !data) return [];

    return data.map((p) => ({
      id: p.id,
      label: p.full_name,
      subtitle: p.primary_role ?? undefined,
    }));
  }, []);

  return search;
}
