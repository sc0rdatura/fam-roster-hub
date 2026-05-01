import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCombobox } from "@/components/CountryCombobox";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const ROLE_TYPES = ["Composer", "Music Supervisor", "Music Editor", "Other"] as const;

const createClientSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  role_type: z.enum(ROLE_TYPES, {
    message: "Role is required",
  }),
  imdb_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  website_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  manager_name: z.string().optional(),
  manager_email: z.string().email("Must be a valid email").or(z.literal("")).optional(),
});

type CreateClientValues = z.infer<typeof createClientSchema>;

export function AddClientDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [baseLocations, setBaseLocations] = useState<string[]>([]);
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [primaryTax, setPrimaryTax] = useState<string[]>([]);
  const [secondaryTax, setSecondaryTax] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateClientValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      full_name: "",
      role_type: "" as unknown as CreateClientValues["role_type"],
      imdb_url: "",
      website_url: "",
      manager_name: "",
      manager_email: "",
    },
  });

  function resetForm() {
    reset();
    setBaseLocations([]);
    setNationalities([]);
    setPrimaryTax([]);
    setSecondaryTax([]);
  }

  async function onSubmit(values: CreateClientValues) {
    setSaving(true);

    const { data, error } = await supabase
      .from("clients")
      .insert({
        full_name: values.full_name,
        role_type: values.role_type,
        imdb_url: values.imdb_url || null,
        website_url: values.website_url || null,
        manager_name: values.manager_name || null,
        manager_email: values.manager_email || null,
        base_locations: baseLocations.length > 0 ? baseLocations : null,
        nationalities: nationalities.length > 0 ? nationalities : null,
        primary_tax_territory: primaryTax[0] || null,
        secondary_tax_territory: secondaryTax[0] || null,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error("Failed to create client: " + error.message);
      return;
    }

    toast.success("Client created successfully");
    setOpen(false);
    resetForm();
    navigate(`/clients/${data.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Add client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add new client</DialogTitle>
          <DialogDescription>
            Enter the client's details below. Name and role are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-full_name">Full name *</Label>
            <Input id="new-full_name" {...register("full_name")} />
            {errors.full_name && (
              <p className="text-sm text-red-600">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role type *</Label>
            <Select
              value={watch("role_type") || ""}
              onValueChange={(v) =>
                setValue("role_type", v as CreateClientValues["role_type"], {
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
            <Label htmlFor="new-imdb_url">IMDb URL</Label>
            <Input
              id="new-imdb_url"
              placeholder="https://www.imdb.com/name/…"
              {...register("imdb_url")}
            />
            {errors.imdb_url && (
              <p className="text-sm text-red-600">{errors.imdb_url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-website_url">Website URL</Label>
            <Input
              id="new-website_url"
              placeholder="https://…"
              {...register("website_url")}
            />
            {errors.website_url && (
              <p className="text-sm text-red-600">{errors.website_url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-manager_name">Manager name</Label>
            <Input id="new-manager_name" {...register("manager_name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-manager_email">Manager email</Label>
            <Input
              id="new-manager_email"
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

          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create client"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
