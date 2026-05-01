import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import type { Client, Enums } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BioRichTextEditor } from "@/components/BioRichTextEditor";
import { sanitizeBioHtml } from "@/lib/bioSanitizer";
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

const BIO_STATUS = ["draft", "published"] as const;

const clientSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  role_type: z.enum(ROLE_TYPES, {
    message: "Role is required",
  }),
  imdb_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  website_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  manager_name: z.string().optional(),
  manager_email: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  is_active: z.boolean(),
  bio_short: z.string().optional(),
  bio_short_draft: z.string().optional(),
  bio_status: z.enum(BIO_STATUS).nullable().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientEditFormProps {
  client: Client;
  onSaved: (updated: Client) => void;
  onCancel: () => void;
}

function bioForStorage(html: string): string | null {
  const sanitized = sanitizeBioHtml(html);
  const text = sanitized.replace(/<[^>]+>/g, "").trim();
  if (!text) return null;
  return sanitized;
}

const EMPTY_BIO = "<p></p>";

export function ClientEditForm({ client, onSaved, onCancel }: ClientEditFormProps) {
  const [saving, setSaving] = useState(false);
  const [bioFull, setBioFull] = useState(
    () => client.bio_full?.trim() ? client.bio_full : EMPTY_BIO,
  );
  const [bioFullDraft, setBioFullDraft] = useState(
    () => client.bio_full_draft?.trim() ? client.bio_full_draft : EMPTY_BIO,
  );
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
      bio_short: client.bio_short ?? "",
      bio_short_draft: client.bio_short_draft ?? "",
      bio_status: (client.bio_status ?? "draft") as Enums<"content_status">,
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
        bio_full: bioForStorage(bioFull),
        bio_full_draft: bioForStorage(bioFullDraft),
        bio_short: values.bio_short?.trim() || null,
        bio_short_draft: values.bio_short_draft?.trim() || null,
        bio_status: values.bio_status ?? "draft",
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

  function publishDraftToPublished() {
    setBioFull(bioFullDraft);
    setValue("bio_short", watch("bio_short_draft") ?? "", { shouldDirty: true });
    setValue("bio_status", "published", { shouldValidate: true });
    toast.success("Draft copied into published fields. Save changes to persist.");
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

      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Bio</h3>
        <p className="text-xs text-muted-foreground">
          Long bios allow bold and italic only. Content is sanitized on save to{" "}
          <code className="rounded bg-muted px-1">&lt;p&gt;</code>,{" "}
          <code className="rounded bg-muted px-1">&lt;strong&gt;</code>,{" "}
          <code className="rounded bg-muted px-1">&lt;em&gt;</code>,{" "}
          <code className="rounded bg-muted px-1">&lt;br&gt;</code>.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Published long bio</Label>
            <BioRichTextEditor
              key={`${client.id}-bio-full`}
              value={bioFull}
              onChange={setBioFull}
            />
          </div>
          <div className="space-y-2">
            <Label>Draft long bio</Label>
            <BioRichTextEditor
              key={`${client.id}-bio-draft`}
              value={bioFullDraft}
              onChange={setBioFullDraft}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio_short">Published short bio</Label>
            <Textarea
              id="bio_short"
              rows={4}
              {...register("bio_short")}
              placeholder="Plain text pitch / short bio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio_short_draft">Draft short bio</Label>
            <Textarea
              id="bio_short_draft"
              rows={4}
              {...register("bio_short_draft")}
              placeholder="Work in progress short bio"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label>Bio status</Label>
            <Select
              value={watch("bio_status") ?? "draft"}
              onValueChange={(v) =>
                setValue("bio_status", v as Enums<"content_status">, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="published">published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={publishDraftToPublished}>
            Publish draft → published
          </Button>
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
