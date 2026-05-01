import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Enums } from "@/types";
import {
  SearchableCombobox,
  type ComboboxItem,
} from "@/components/SearchableCombobox";
import { useProjectSearch } from "@/hooks/useProjectSearch";
import { usePersonSearch } from "@/hooks/usePersonSearch";
import { useCompanySearch } from "@/hooks/useCompanySearch";
import { useLookupTable } from "@/hooks/useLookupTable";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

const PROJECT_CATEGORIES: Enums<"project_category">[] = [
  "Film", "TV", "Games", "Theatre", "Other",
];

const COMPANY_ROLES: Enums<"project_company_role">[] = [
  "Production Company", "Studio", "Network", "Distributor", "Other",
];

interface PersonEntry {
  id: string | null;
  name: string;
  primaryRole: string;
  role: string;
}

interface CompanyEntry {
  id: string | null;
  name: string;
  type: Enums<"company_type"> | "";
  projectRole: Enums<"project_company_role">;
}

interface CreditEntryDialogProps {
  clientId: string;
  onCreditCreated: () => void;
}

export function CreditEntryDialog({ clientId, onCreditCreated }: CreditEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Project state
  const [selectedProject, setSelectedProject] = useState<ComboboxItem | null>(null);
  const [isNewProject, setIsNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [existingProjectDetails, setExistingProjectDetails] = useState<{
    category: string;
    sub_type: string | null;
    year_start: number | null;
    year_end: number | null;
    status: string | null;
    imdb_url: string | null;
    people: { name: string; role: string }[];
    companies: { name: string; role: string }[];
  } | null>(null);
  const [projectCategory, setProjectCategory] = useState<string>("");
  const [projectSubType, setProjectSubType] = useState<string>("");
  const [projectYearStart, setProjectYearStart] = useState("");
  const [projectYearEnd, setProjectYearEnd] = useState("");
  const [projectStatus, setProjectStatus] = useState<string>("");
  const [projectImdbUrl, setProjectImdbUrl] = useState("");

  // People state
  const [people, setPeople] = useState<PersonEntry[]>([]);
  const [pendingPerson, setPendingPerson] = useState<ComboboxItem | null>(null);
  const [pendingPersonRole, setPendingPersonRole] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonPrimaryRole, setNewPersonPrimaryRole] = useState("");
  const [isNewPerson, setIsNewPerson] = useState(false);

  // Companies state
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);
  const [pendingCompany, setPendingCompany] = useState<ComboboxItem | null>(null);
  const [pendingCompanyRole, setPendingCompanyRole] = useState<string>("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyType, setNewCompanyType] = useState<string>("");
  const [isNewCompany, setIsNewCompany] = useState(false);

  // Credit state (T6c scope, wired here)
  const [creditRole, setCreditRole] = useState("");
  const [creditStatus, setCreditStatus] = useState<"draft" | "published">("draft");
  const [internalNotes, setInternalNotes] = useState("");

  const searchProjects = useProjectSearch();
  const searchPeopleDb = usePersonSearch();
  const searchCompaniesDb = useCompanySearch();
  const { rows: subtypes } = useLookupTable("project_subtypes");
  const { rows: peopleRoles } = useLookupTable("project_people_roles");
  const { rows: creditRoles } = useLookupTable("credit_roles");

  async function fetchProjectDetails(projectId: string) {
    const [projRes, ppRes, pcRes] = await Promise.all([
      supabase
        .from("projects")
        .select("category, sub_type, year_start, year_end, status, imdb_url")
        .eq("id", projectId)
        .single(),
      supabase
        .from("project_people")
        .select("role_on_project, people!inner(full_name)")
        .eq("project_id", projectId),
      supabase
        .from("project_companies")
        .select("role, companies!inner(name)")
        .eq("project_id", projectId),
    ]);

    if (projRes.data) {
      const peopleMapped = (ppRes.data ?? []).map((r: any) => ({
        name: r.people.full_name,
        role: r.role_on_project,
      }));
      const companiesMapped = (pcRes.data ?? []).map((r: any) => ({
        name: r.companies.name,
        role: r.role,
      }));
      setExistingProjectDetails({
        ...projRes.data,
        people: peopleMapped,
        companies: companiesMapped,
      });
    }
  }

  const searchPeople = useCallback(async (query: string): Promise<ComboboxItem[]> => {
    const dbResults = await searchPeopleDb(query);
    const q = query.toLowerCase();
    const unsavedByName = new Map<string, PersonEntry>();
    for (const p of people) {
      if (p.id === null && !unsavedByName.has(p.name.toLowerCase())) {
        unsavedByName.set(p.name.toLowerCase(), p);
      }
    }
    const localResults: ComboboxItem[] = [];
    for (const [, p] of unsavedByName) {
      if (p.name.toLowerCase().includes(q)) {
        const alreadyInDb = dbResults.some(r => r.label.toLowerCase() === p.name.toLowerCase());
        if (!alreadyInDb) {
          localResults.push({
            id: `__unsaved__${p.name}`,
            label: p.name,
            subtitle: `${p.primaryRole || "New"} (unsaved)`,
          });
        }
      }
    }
    return [...localResults, ...dbResults];
  }, [searchPeopleDb, people]);

  const searchCompanies = useCallback(async (query: string): Promise<ComboboxItem[]> => {
    const dbResults = await searchCompaniesDb(query);
    const q = query.toLowerCase();
    const unsavedByName = new Map<string, CompanyEntry>();
    for (const c of companies) {
      if (c.id === null && !unsavedByName.has(c.name.toLowerCase())) {
        unsavedByName.set(c.name.toLowerCase(), c);
      }
    }
    const localResults: ComboboxItem[] = [];
    for (const [, c] of unsavedByName) {
      if (c.name.toLowerCase().includes(q)) {
        const alreadyInDb = dbResults.some(r => r.label.toLowerCase() === c.name.toLowerCase());
        if (!alreadyInDb) {
          localResults.push({
            id: `__unsaved__${c.name}`,
            label: c.name,
            subtitle: `${c.type || "New"} (unsaved)`,
          });
        }
      }
    }
    return [...localResults, ...dbResults];
  }, [searchCompaniesDb, companies]);

  function resetAll() {
    setSelectedProject(null);
    setIsNewProject(false);
    setNewProjectTitle("");
    setExistingProjectDetails(null);
    setProjectCategory("");
    setProjectSubType("");
    setProjectYearStart("");
    setProjectYearEnd("");
    setProjectStatus("");
    setProjectImdbUrl("");
    setPeople([]);
    setPendingPerson(null);
    setPendingPersonRole("");
    setNewPersonName("");
    setNewPersonPrimaryRole("");
    setIsNewPerson(false);
    setCompanies([]);
    setPendingCompany(null);
    setPendingCompanyRole("");
    setNewCompanyName("");
    setNewCompanyType("");
    setIsNewCompany(false);
    setCreditRole("");
    setCreditStatus("draft");
    setInternalNotes("");
  }

  function addPerson() {
    if (isNewPerson) {
      if (!newPersonName.trim() || !pendingPersonRole) return;
      setPeople((prev) => [...prev, { id: null, name: newPersonName.trim(), primaryRole: newPersonPrimaryRole, role: pendingPersonRole }]);
    } else {
      if (!pendingPerson || !pendingPersonRole) return;
      const isUnsaved = pendingPerson.id.startsWith("__unsaved__");
      setPeople((prev) => [...prev, { id: isUnsaved ? null : pendingPerson.id, name: pendingPerson.label, primaryRole: "", role: pendingPersonRole }]);
    }
    setPendingPerson(null);
    setPendingPersonRole("");
    setNewPersonName("");
    setNewPersonPrimaryRole("");
    setIsNewPerson(false);
  }

  function addCompany() {
    if (isNewCompany) {
      if (!newCompanyName.trim() || !pendingCompanyRole) return;
      setCompanies((prev) => [...prev, {
        id: null,
        name: newCompanyName.trim(),
        type: newCompanyType as CompanyEntry["type"],
        projectRole: pendingCompanyRole as CompanyEntry["projectRole"],
      }]);
    } else {
      if (!pendingCompany || !pendingCompanyRole) return;
      const isUnsaved = pendingCompany.id.startsWith("__unsaved__");
      setCompanies((prev) => [...prev, {
        id: isUnsaved ? null : pendingCompany.id,
        name: pendingCompany.label,
        type: "",
        projectRole: pendingCompanyRole as CompanyEntry["projectRole"],
      }]);
    }
    setPendingCompany(null);
    setPendingCompanyRole("");
    setNewCompanyName("");
    setNewCompanyType("");
    setIsNewCompany(false);
  }

  async function handleSubmit() {
    if (!creditRole) {
      toast.error("Please select a credit role for this client.");
      return;
    }

    if (!selectedProject && !isNewProject) {
      toast.error("Please select or create a project.");
      return;
    }

    if (isNewProject && (!newProjectTitle.trim() || !projectCategory)) {
      toast.error("New projects require a title and category.");
      return;
    }

    setSaving(true);

    try {
      // Step 1: Get or create project
      let projectId: string;

      if (isNewProject) {
        const { data: proj, error: projErr } = await supabase
          .from("projects")
          .insert({
            title: newProjectTitle.trim(),
            category: projectCategory as Enums<"project_category">,
            sub_type: projectSubType || null,
            year_start: projectYearStart ? parseInt(projectYearStart) : null,
            year_end: projectYearEnd ? parseInt(projectYearEnd) : null,
            status: projectStatus ? (projectStatus as Enums<"project_status">) : null,
            imdb_url: projectImdbUrl || null,
          })
          .select("id")
          .single();

        if (projErr) throw new Error(`Project: ${projErr.message}`);
        projectId = proj.id;
      } else {
        projectId = selectedProject!.id;
      }

      // Step 2: Create people and project_people records
      // Deduplicate new people by name so the same person added with two roles
      // is only created once in the people table
      const newPersonIds = new Map<string, string>();

      for (const person of people) {
        let personId = person.id;

        if (!personId) {
          const nameKey = person.name.toLowerCase();
          if (newPersonIds.has(nameKey)) {
            personId = newPersonIds.get(nameKey)!;
          } else {
            const { data: newP, error: pErr } = await supabase
              .from("people")
              .insert({ full_name: person.name, primary_role: person.primaryRole || null })
              .select("id")
              .single();

            if (pErr) throw new Error(`Person "${person.name}": ${pErr.message}`);
            personId = newP.id;
            newPersonIds.set(nameKey, personId);
          }
        }

        const { error: ppErr } = await supabase
          .from("project_people")
          .insert({
            project_id: projectId,
            person_id: personId,
            role_on_project: person.role,
          });

        if (ppErr && !ppErr.message.includes("duplicate")) {
          throw new Error(`Project-person link: ${ppErr.message}`);
        }
      }

      // Step 3: Create companies and project_companies records
      for (const company of companies) {
        let companyId = company.id;

        if (!companyId) {
          const { data: newC, error: cErr } = await supabase
            .from("companies")
            .insert({
              name: company.name,
              type: (company.type || "Other") as Enums<"company_type">,
            })
            .select("id")
            .single();

          if (cErr) throw new Error(`Company "${company.name}": ${cErr.message}`);
          companyId = newC.id;
        }

        const { error: pcErr } = await supabase
          .from("project_companies")
          .insert({
            project_id: projectId,
            company_id: companyId,
            role: company.projectRole,
          });

        if (pcErr && !pcErr.message.includes("duplicate")) {
          throw new Error(`Project-company link: ${pcErr.message}`);
        }
      }

      // Step 4: Create credit (T6c scope)
      const { error: creditErr } = await supabase
        .from("credits")
        .insert({
          client_id: clientId,
          project_id: projectId,
          role: creditRole,
          status: creditStatus,
          submitted_by: "admin",
          internal_notes: internalNotes || null,
        });

      if (creditErr) {
        if (creditErr.message.includes("duplicate") || creditErr.message.includes("unique")) {
          throw new Error("This client already has a credit on this project.");
        }
        throw new Error(`Credit: ${creditErr.message}`);
      }

      toast.success("Credit created successfully");
      setOpen(false);
      resetAll();
      onCreditCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Add credit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add credit</DialogTitle>
          <DialogDescription>
            Search for an existing project or create a new one, then assign
            collaborators and the client's credit role.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* === PROJECT SECTION === */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Project</h3>

            {!isNewProject ? (
              <div className="space-y-2">
                <SearchableCombobox
                  onSearch={searchProjects}
                  onSelect={(item) => {
                    setSelectedProject(item);
                    setIsNewProject(false);
                    setExistingProjectDetails(null);
                    fetchProjectDetails(item.id);
                  }}
                  onCreate={(query) => {
                    setIsNewProject(true);
                    setNewProjectTitle(query);
                    setSelectedProject(null);
                    setExistingProjectDetails(null);
                  }}
                  value={selectedProject}
                  placeholder="Search projects…"
                  createLabel="Create new project"
                />
                {selectedProject && existingProjectDetails && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category</span>
                        <span className="font-medium">{existingProjectDetails.category}</span>
                      </div>
                      {existingProjectDetails.sub_type && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sub-type</span>
                          <span className="font-medium">
                            {subtypes.find((s) => s.value === existingProjectDetails.sub_type)?.display_label ?? existingProjectDetails.sub_type}
                          </span>
                        </div>
                      )}
                      {(existingProjectDetails.year_start || existingProjectDetails.year_end) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Year</span>
                          <span className="font-medium">
                            {existingProjectDetails.year_start && existingProjectDetails.year_end
                              ? existingProjectDetails.year_start === existingProjectDetails.year_end
                                ? `${existingProjectDetails.year_start}`
                                : `${existingProjectDetails.year_start}–${existingProjectDetails.year_end}`
                              : existingProjectDetails.year_start ?? existingProjectDetails.year_end}
                          </span>
                        </div>
                      )}
                      {existingProjectDetails.status && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className="font-medium">{existingProjectDetails.status}</span>
                        </div>
                      )}
                      {existingProjectDetails.imdb_url && (
                        <div className="flex justify-between sm:col-span-2">
                          <span className="text-muted-foreground">IMDb</span>
                          <a
                            href={existingProjectDetails.imdb_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate font-medium text-blue-600 hover:underline"
                          >
                            {existingProjectDetails.imdb_url}
                          </a>
                        </div>
                      )}
                    </div>
                    {existingProjectDetails.people.length > 0 && (
                      <div className="mt-2 border-t pt-2">
                        <span className="text-xs font-medium text-muted-foreground">People</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {existingProjectDetails.people.map((p, i) => {
                            const roleLabel = peopleRoles.find((r) => r.value === p.role)?.display_label ?? p.role;
                            return (
                              <Badge key={i} variant="outline" className="text-xs">
                                {p.name} — {roleLabel}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {existingProjectDetails.companies.length > 0 && (
                      <div className="mt-2 border-t pt-2">
                        <span className="text-xs font-medium text-muted-foreground">Companies</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {existingProjectDetails.companies.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {c.name} — {c.role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New project</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setIsNewProject(false); setNewProjectTitle(""); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Title *</Label>
                    <Input
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Category *</Label>
                    <Select value={projectCategory} onValueChange={setProjectCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Sub-type</Label>
                    <Select value={projectSubType} onValueChange={setProjectSubType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {subtypes.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.display_label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select
                      value={projectStatus}
                      onValueChange={(v) => setProjectStatus(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="In Production">In Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Year start</Label>
                    <Input
                      type="number"
                      value={projectYearStart}
                      onChange={(e) => setProjectYearStart(e.target.value)}
                      placeholder="e.g. 2024"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Year end</Label>
                    <Input
                      type="number"
                      value={projectYearEnd}
                      onChange={(e) => setProjectYearEnd(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>IMDb URL</Label>
                    <Input
                      value={projectImdbUrl}
                      onChange={(e) => setProjectImdbUrl(e.target.value)}
                      placeholder="https://www.imdb.com/title/…"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <Separator />

          {/* === PEOPLE SECTION === */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">People (directors, producers, etc.)</h3>

            {people.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {people.map((p, i) => {
                  const roleLabel = peopleRoles.find((r) => r.value === p.role)?.display_label ?? p.role;
                  return (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {p.name} — {roleLabel}
                      <button type="button" onClick={() => setPeople(people.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            <div className="space-y-2 rounded-md border p-3">
              {!isNewPerson ? (
                <SearchableCombobox
                  onSearch={searchPeople}
                  onSelect={(item) => { setPendingPerson(item); setIsNewPerson(false); }}
                  onCreate={(query) => { setIsNewPerson(true); setNewPersonName(query); setPendingPerson(null); }}
                  value={pendingPerson}
                  placeholder="Search people…"
                  createLabel="Create new person"
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">New person: {newPersonName}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setIsNewPerson(false); setNewPersonName(""); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Primary role (e.g. Director)"
                    value={newPersonPrimaryRole}
                    onChange={(e) => setNewPersonPrimaryRole(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Role on project</Label>
                  <Select value={pendingPersonRole} onValueChange={setPendingPersonRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role…" />
                    </SelectTrigger>
                    <SelectContent>
                      {peopleRoles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.display_label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPerson}
                  disabled={!pendingPersonRole || (!pendingPerson && !isNewPerson)}
                >
                  Add
                </Button>
              </div>
            </div>
          </section>

          <Separator />

          {/* === COMPANIES SECTION === */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Companies (production co., studio, network, etc.)</h3>

            {companies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {companies.map((c, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {c.name} — {c.projectRole}
                    <button type="button" onClick={() => setCompanies(companies.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-md border p-3">
              {!isNewCompany ? (
                <SearchableCombobox
                  onSearch={searchCompanies}
                  onSelect={(item) => { setPendingCompany(item); setIsNewCompany(false); }}
                  onCreate={(query) => { setIsNewCompany(true); setNewCompanyName(query); setPendingCompany(null); }}
                  value={pendingCompany}
                  placeholder="Search companies…"
                  createLabel="Create new company"
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">New company: {newCompanyName}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setIsNewCompany(false); setNewCompanyName(""); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Select value={newCompanyType} onValueChange={setNewCompanyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Company type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(["Production Company", "Studio", "Network", "Streamer", "Agency", "Other"] as const).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Role on project</Label>
                  <Select value={pendingCompanyRole} onValueChange={setPendingCompanyRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role…" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCompany}
                  disabled={!pendingCompanyRole || (!pendingCompany && !isNewCompany)}
                >
                  Add
                </Button>
              </div>
            </div>
          </section>

          <Separator />

          {/* === CREDIT ROLE SECTION (T6c) === */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Client credit</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Credit role *</Label>
                <Select value={creditRole} onValueChange={setCreditRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role…" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.display_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={creditStatus} onValueChange={(v) => setCreditStatus(v as "draft" | "published")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label>Internal notes</Label>
                <Input
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Admin-only notes (never shown on profile or CV)"
                />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : "Save credit"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
