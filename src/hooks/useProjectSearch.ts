import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { ComboboxItem } from "@/components/SearchableCombobox";

export function useProjectSearch() {
  const search = useCallback(async (query: string): Promise<ComboboxItem[]> => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, category")
      .is("deleted_at", null)
      .ilike("title", `%${query}%`)
      .order("title")
      .limit(20);

    if (error || !data) return [];

    return data.map((p) => ({
      id: p.id,
      label: p.title,
      subtitle: p.category,
    }));
  }, []);

  return search;
}
