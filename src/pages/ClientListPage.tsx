import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Client } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const ROLE_TYPES = ["Composer", "Music Supervisor", "Music Editor", "Other"] as const;

export default function ClientListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .is("deleted_at", null)
      .order("full_name");

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setClients(data ?? []);
    setLoading(false);
  }

  const filtered = clients.filter((client) => {
    if (!showInactive && !client.is_active) return false;
    if (roleFilter !== "all" && client.role_type !== roleFilter) return false;
    if (
      searchQuery &&
      !client.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Clients</h1>
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">Failed to load clients: {error}</p>
          <button
            onClick={fetchClients}
            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <span className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "client" : "clients"}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search by name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLE_TYPES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm">
            Show inactive
          </Label>
        </div>
      </div>

      <div className="mt-6 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {clients.length === 0
                    ? "No clients yet."
                    : "No clients match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link
                      to={`/clients/${client.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {client.full_name}
                    </Link>
                  </TableCell>
                  <TableCell>{client.role_type}</TableCell>
                  <TableCell>
                    <Badge variant={client.is_active ? "default" : "secondary"}>
                      {client.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.base_locations?.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(client.updated_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
