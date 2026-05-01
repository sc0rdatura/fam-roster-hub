import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface LookupRow {
  value: string;
  display_label: string;
}

type LookupTableName = "credit_roles" | "project_subtypes" | "project_people_roles";

const cache = new Map<string, LookupRow[]>();

export function useLookupTable(tableName: LookupTableName) {
  const [rows, setRows] = useState<LookupRow[]>(cache.get(tableName) ?? []);
  const [loading, setLoading] = useState(!cache.has(tableName));
  const fetched = useRef(cache.has(tableName));

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    async function fetch() {
      const { data, error } = await supabase
        .from(tableName)
        .select("value, display_label")
        .order("display_label");

      if (!error && data) {
        cache.set(tableName, data);
        setRows(data);
      }
      setLoading(false);
    }

    fetch();
  }, [tableName]);

  return { rows, loading };
}
