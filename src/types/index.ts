export type { Database, Json } from "@/lib/database.types";
export type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "@/lib/database.types";

export type Client = Tables<"clients">;
export type ClientInsert = TablesInsert<"clients">;
export type ClientUpdate = TablesUpdate<"clients">;

export type Project = Tables<"projects">;
export type ProjectInsert = TablesInsert<"projects">;

export type Credit = Tables<"credits">;
export type CreditInsert = TablesInsert<"credits">;

export type Person = Tables<"people">;
export type PersonInsert = TablesInsert<"people">;

export type Company = Tables<"companies">;
export type CompanyInsert = TablesInsert<"companies">;

export type Relationship = Tables<"relationships">;
export type RelationshipInsert = TablesInsert<"relationships">;

export type Award = Tables<"awards">;
export type AwardInsert = TablesInsert<"awards">;

export type Reel = Tables<"reels">;
export type ReelInsert = TablesInsert<"reels">;

export type ProjectPerson = Tables<"project_people">;
export type ProjectCompany = Tables<"project_companies">;

export type ClientCompanyRelationship = Tables<"client_company_relationships">;

export type CreditRole = Tables<"credit_roles">;
export type ProjectSubtype = Tables<"project_subtypes">;
export type ProjectPeopleRole = Tables<"project_people_roles">;

export type UserRole = Tables<"user_roles">;
