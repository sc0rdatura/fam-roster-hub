import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { ComboboxItem } from "@/components/SearchableCombobox";

export function useCompanySearch() {
  const search = useCallback(async (query: string): Promise<ComboboxItem[]> => {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, type")
      .is("deleted_at", null)
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(20);

    if (error || !data) return [];

    return data.map((c) => ({
      id: c.id,
      label: c.name,
      subtitle: c.type,
    }));
  }, []);

  return search;
}
