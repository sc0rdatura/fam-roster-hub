import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CountryComboboxProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  multiple?: boolean;
}

export function CountryCombobox({
  value,
  onChange,
  placeholder = "Select country…",
  multiple = true,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(country: string) {
    if (multiple) {
      if (value.includes(country)) {
        onChange(value.filter((v) => v !== country));
      } else {
        onChange([...value, country]);
      }
    } else {
      onChange([country]);
      setOpen(false);
    }
  }

  function handleRemove(country: string) {
    onChange(value.filter((v) => v !== country));
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {!multiple && value.length === 1
              ? value[0]
              : value.length > 0
                ? `${value.length} selected`
                : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries…" />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country}
                  value={country}
                  onSelect={() => handleSelect(country)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(country) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {country}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {multiple && value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((country) => (
            <Badge key={country} variant="secondary" className="gap-1">
              {country}
              <button
                type="button"
                onClick={() => handleRemove(country)}
                className="ml-0.5 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
