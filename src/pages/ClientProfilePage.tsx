import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Client } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientEditForm } from "@/components/ClientEditForm";
import { CreditEntryDialog } from "@/components/CreditEntryDialog";
import { CreditList } from "@/components/CreditList";
import { RelationshipList } from "@/components/RelationshipList";
import { ArrowLeft, ExternalLink, Globe, Film, Pencil } from "lucide-react";

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [creditRefreshKey, setCreditRefreshKey] = useState(0);

  useEffect(() => {
    if (!id) return;

    async function fetchClient() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id!)
        .is("deleted_at", null)
        .single();

      if (fetchError) {
        setError(
          fetchError.code === "PGRST116"
            ? "Client not found."
            : fetchError.message
        );
        setLoading(false);
        return;
      }

      setClient(data);
      setLoading(false);
    }

    fetchClient();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="mb-2 h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-8">
        <Link
          to="/clients"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error ?? "Client not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link
        to="/clients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.full_name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-muted-foreground">{client.role_type}</span>
            <Badge variant={client.is_active ? "default" : "secondary"}>
              {client.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
          {client.imdb_url && (
            <a
              href={client.imdb_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Film className="h-4 w-4" />
              IMDb
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {client.website_url && (
            <a
              href={client.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              Website
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {editing ? (
        <ClientEditForm
          client={client}
          onSaved={(updated) => {
            setClient(updated);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="awards">Awards</TabsTrigger>
          <TabsTrigger value="reels">Reels</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bio</CardTitle>
              </CardHeader>
              <CardContent>
                {client.bio_full ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: client.bio_full }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No bio added yet.
                  </p>
                )}
                {client.bio_status && (
                  <Badge variant="outline" className="mt-3">
                    Bio: {client.bio_status}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow
                    label="Base locations"
                    value={client.base_locations?.join(", ")}
                  />
                  <DetailRow
                    label="Nationalities"
                    value={client.nationalities?.join(", ")}
                  />
                  <DetailRow
                    label="Primary tax territory"
                    value={client.primary_tax_territory}
                  />
                  <DetailRow
                    label="Secondary tax territory"
                    value={client.secondary_tax_territory}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label="Manager" value={client.manager_name} />
                  <DetailRow
                    label="Manager email"
                    value={client.manager_email}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="credits" className="mt-6">
          <div className="mb-4 flex justify-end">
            <CreditEntryDialog
              clientId={client.id}
              onCreditCreated={() => setCreditRefreshKey((k) => k + 1)}
            />
          </div>
          <CreditList clientId={client.id} refreshKey={creditRefreshKey} />
        </TabsContent>

        <TabsContent value="awards" className="mt-6">
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Awards will be displayed here once awards management is built.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reels" className="mt-6">
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Reels will be displayed here once reels management is built.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships" className="mt-6">
          <RelationshipList clientId={client.id} />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}
