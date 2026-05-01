import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import type { Client } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCombobox } from "@/components/CountryCombobox";
import { toast } from "sonner";
import { useState } from "react";

const ROLE_TYPES = ["Composer", "Music Supervisor", "Music Editor", "Other"] as const;

const clientSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  role_type: z.enum(ROLE_TYPES, {
    required_error: "Role is required",
    message: "Role is required",
  }),
  imdb_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  website_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  manager_name: z.string().optional(),
  manager_email: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  is_active: z.boolean(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientEditFormProps {
  client: Client;
  onSaved: (updated: Client) => void;
  onCancel: () => void;
}

export function ClientEditForm({ client, onSaved, onCancel }: ClientEditFormProps) {
  const [saving, setSaving] = useState(false);
  const [baseLocations, setBaseLocations] = useState<string[]>(
    client.base_locations ?? []
  );
  const [nationalities, setNationalities] = useState<string[]>(
    client.nationalities ?? []
  );
  const [primaryTax, setPrimaryTax] = useState<string[]>(
    client.primary_tax_territory ? [client.primary_tax_territory] : []
  );
  const [secondaryTax, setSecondaryTax] = useState<string[]>(
    client.secondary_tax_territory ? [client.secondary_tax_territory] : []
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: client.full_name,
      role_type: client.role_type,
      imdb_url: client.imdb_url ?? "",
      website_url: client.website_url ?? "",
      manager_name: client.manager_name ?? "",
      manager_email: client.manager_email ?? "",
      is_active: client.is_active,
    },
  });

  const isActive = watch("is_active");

  async function onSubmit(values: ClientFormValues) {
    setSaving(true);

    const { data, error } = await supabase
      .from("clients")
      .update({
        full_name: values.full_name,
        role_type: values.role_type,
        imdb_url: values.imdb_url || null,
        website_url: values.website_url || null,
        manager_name: values.manager_name || null,
        manager_email: values.manager_email || null,
        is_active: values.is_active,
        base_locations: baseLocations.length > 0 ? baseLocations : null,
        nationalities: nationalities.length > 0 ? nationalities : null,
        primary_tax_territory: primaryTax[0] || null,
        secondary_tax_territory: secondaryTax[0] || null,
      })
      .eq("id", client.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }

    toast.success("Client updated successfully");
    onSaved(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name *</Label>
          <Input id="full_name" {...register("full_name")} />
          {errors.full_name && (
            <p className="text-sm text-red-600">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Role type *</Label>
          <Select
            value={watch("role_type")}
            onValueChange={(v) =>
              setValue("role_type", v as ClientFormValues["role_type"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_TYPES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role_type && (
            <p className="text-sm text-red-600">{errors.role_type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="imdb_url">IMDb URL</Label>
          <Input
            id="imdb_url"
            placeholder="https://www.imdb.com/name/…"
            {...register("imdb_url")}
          />
          {errors.imdb_url && (
            <p className="text-sm text-red-600">{errors.imdb_url.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website_url">Website URL</Label>
          <Input
            id="website_url"
            placeholder="https://…"
            {...register("website_url")}
          />
          {errors.website_url && (
            <p className="text-sm text-red-600">{errors.website_url.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="manager_name">Manager name</Label>
          <Input id="manager_name" {...register("manager_name")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manager_email">Manager email</Label>
          <Input
            id="manager_email"
            type="email"
            {...register("manager_email")}
          />
          {errors.manager_email && (
            <p className="text-sm text-red-600">{errors.manager_email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Base locations</Label>
          <CountryCombobox
            value={baseLocations}
            onChange={setBaseLocations}
            placeholder="Select countries…"
            multiple
          />
        </div>

        <div className="space-y-2">
          <Label>Nationalities</Label>
          <CountryCombobox
            value={nationalities}
            onChange={setNationalities}
            placeholder="Select nationalities…"
            multiple
          />
        </div>

        <div className="space-y-2">
          <Label>Primary tax territory</Label>
          <CountryCombobox
            value={primaryTax}
            onChange={setPrimaryTax}
            placeholder="Select country…"
            multiple={false}
          />
        </div>

        <div className="space-y-2">
          <Label>Secondary tax territory</Label>
          <CountryCombobox
            value={secondaryTax}
            onChange={setSecondaryTax}
            placeholder="Select country…"
            multiple={false}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="is_active"
          checked={isActive}
          onCheckedChange={(checked) => setValue("is_active", checked)}
        />
        <Label htmlFor="is_active">Active on roster</Label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
