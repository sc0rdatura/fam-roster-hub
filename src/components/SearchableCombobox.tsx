import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandGroup,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxItem {
  id: string;
  label: string;
  subtitle?: string;
}

interface SearchableComboboxProps {
  onSearch: (query: string) => Promise<ComboboxItem[]>;
  onSelect: (item: ComboboxItem) => void;
  onCreate?: (query: string) => void;
  value?: ComboboxItem | null;
  placeholder?: string;
  createLabel?: string;
  disabled?: boolean;
}

export function SearchableCombobox({
  onSearch,
  onSelect,
  onCreate,
  value,
  placeholder = "Search…",
  createLabel = "Create new",
  disabled = false,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ComboboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const items = await onSearch(query.trim());
      setResults(items);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, onSearch]);

  function handleSelect(item: ComboboxItem) {
    onSelect(item);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  function handleCreate() {
    onCreate?.(query.trim());
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  // Always allow creating new items even if an exact name match exists
  // (e.g. two different projects can share the same title)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="truncate">{value.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : query.trim() && results.length === 0 && !onCreate ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : query.trim() && results.length === 0 && onCreate ? (
              <CommandEmpty>No existing matches.</CommandEmpty>
            ) : null}

            {results.length > 0 && (
              <CommandGroup heading="Existing">
                {results.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {onCreate && query.trim() && (
              <>
                {results.length > 0 && <CommandSeparator />}
                <CommandGroup>
                  <CommandItem onSelect={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    {createLabel}: "{query.trim()}"
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
