export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      awards: {
        Row: {
          id: string
          client_id: string
          award_body: string
          category: string
          project_id: string | null
          result: Database["public"]["Enums"]["award_result"]
          year: number
          status: Database["public"]["Enums"]["content_status"]
          submitted_by: Database["public"]["Enums"]["submitted_by_type"]
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          award_body: string
          category: string
          project_id?: string | null
          result: Database["public"]["Enums"]["award_result"]
          year: number
          status?: Database["public"]["Enums"]["content_status"]
          submitted_by: Database["public"]["Enums"]["submitted_by_type"]
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          award_body?: string
          category?: string
          project_id?: string | null
          result?: Database["public"]["Enums"]["award_result"]
          year?: number
          status?: Database["public"]["Enums"]["content_status"]
          submitted_by?: Database["public"]["Enums"]["submitted_by_type"]
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_company_relationships: {
        Row: {
          id: string
          client_id: string
          company_id: string
          heat_level: Database["public"]["Enums"]["heat_level"] | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          company_id: string
          heat_level?: Database["public"]["Enums"]["heat_level"] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          company_id?: string
          heat_level?: Database["public"]["Enums"]["heat_level"] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_company_relationships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_company_relationships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          id: string
          full_name: string
          role_type: Database["public"]["Enums"]["client_role_type"]
          headshot_url: string | null
          press_photo_urls: string[] | null
          imdb_url: string | null
          website_url: string | null
          bio_full: string | null
          bio_full_draft: string | null
          bio_short: string | null
          bio_short_draft: string | null
          bio_status: Database["public"]["Enums"]["content_status"] | null
          base_locations: string[] | null
          nationalities: string[] | null
          primary_tax_territory: string | null
          secondary_tax_territory: string | null
          manager_name: string | null
          manager_email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          full_name: string
          role_type: Database["public"]["Enums"]["client_role_type"]
          headshot_url?: string | null
          press_photo_urls?: string[] | null
          imdb_url?: string | null
          website_url?: string | null
          bio_full?: string | null
          bio_full_draft?: string | null
          bio_short?: string | null
          bio_short_draft?: string | null
          bio_status?: Database["public"]["Enums"]["content_status"] | null
          base_locations?: string[] | null
          nationalities?: string[] | null
          primary_tax_territory?: string | null
          secondary_tax_territory?: string | null
          manager_name?: string | null
          manager_email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          role_type?: Database["public"]["Enums"]["client_role_type"]
          headshot_url?: string | null
          press_photo_urls?: string[] | null
          imdb_url?: string | null
          website_url?: string | null
          bio_full?: string | null
          bio_full_draft?: string | null
          bio_short?: string | null
          bio_short_draft?: string | null
          bio_status?: Database["public"]["Enums"]["content_status"] | null
          base_locations?: string[] | null
          nationalities?: string[] | null
          primary_tax_territory?: string | null
          secondary_tax_territory?: string | null
          manager_name?: string | null
          manager_email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          name_variants: string[] | null
          type: Database["public"]["Enums"]["company_type"]
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          name_variants?: string[] | null
          type: Database["public"]["Enums"]["company_type"]
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          name_variants?: string[] | null
          type?: Database["public"]["Enums"]["company_type"]
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      credit_roles: {
        Row: {
          value: string
          display_label: string
          created_at: string
        }
        Insert: {
          value: string
          display_label: string
          created_at?: string
        }
        Update: {
          value?: string
          display_label?: string
          created_at?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          id: string
          client_id: string
          project_id: string
          role: string
          status: Database["public"]["Enums"]["content_status"]
          submitted_by: Database["public"]["Enums"]["submitted_by_type"]
          internal_notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          project_id: string
          role: string
          status?: Database["public"]["Enums"]["content_status"]
          submitted_by: Database["public"]["Enums"]["submitted_by_type"]
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          project_id?: string
          role?: string
          status?: Database["public"]["Enums"]["content_status"]
          submitted_by?: Database["public"]["Enums"]["submitted_by_type"]
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "credit_roles"
            referencedColumns: ["value"]
          },
        ]
      }
      people: {
        Row: {
          id: string
          full_name: string
          name_variants: string[] | null
          primary_role: string | null
          company_id: string | null
          email: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          full_name: string
          name_variants?: string[] | null
          primary_role?: string | null
          company_id?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          name_variants?: string[] | null
          primary_role?: string | null
          company_id?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_companies: {
        Row: {
          id: string
          project_id: string
          company_id: string
          role: Database["public"]["Enums"]["project_company_role"]
          deleted_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          company_id: string
          role: Database["public"]["Enums"]["project_company_role"]
          deleted_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          company_id?: string
          role?: Database["public"]["Enums"]["project_company_role"]
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_people: {
        Row: {
          id: string
          project_id: string
          person_id: string
          role_on_project: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          person_id: string
          role_on_project: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          person_id?: string
          role_on_project?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_people_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_people_role_on_project_fkey"
            columns: ["role_on_project"]
            isOneToOne: false
            referencedRelation: "project_people_roles"
            referencedColumns: ["value"]
          },
        ]
      }
      project_people_roles: {
        Row: {
          value: string
          display_label: string
          created_at: string
        }
        Insert: {
          value: string
          display_label: string
          created_at?: string
        }
        Update: {
          value?: string
          display_label?: string
          created_at?: string
        }
        Relationships: []
      }
      project_subtypes: {
        Row: {
          value: string
          display_label: string
          created_at: string
        }
        Insert: {
          value: string
          display_label: string
          created_at?: string
        }
        Update: {
          value?: string
          display_label?: string
          created_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          title: string
          category: Database["public"]["Enums"]["project_category"]
          sub_type: string | null
          year_start: number | null
          year_end: number | null
          status: Database["public"]["Enums"]["project_status"] | null
          imdb_url: string | null
          external_url: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          title: string
          category: Database["public"]["Enums"]["project_category"]
          sub_type?: string | null
          year_start?: number | null
          year_end?: number | null
          status?: Database["public"]["Enums"]["project_status"] | null
          imdb_url?: string | null
          external_url?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          category?: Database["public"]["Enums"]["project_category"]
          sub_type?: string | null
          year_start?: number | null
          year_end?: number | null
          status?: Database["public"]["Enums"]["project_status"] | null
          imdb_url?: string | null
          external_url?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_sub_type_fkey"
            columns: ["sub_type"]
            isOneToOne: false
            referencedRelation: "project_subtypes"
            referencedColumns: ["value"]
          },
        ]
      }
      prowee_listings: {
        Row: {
          id: string
          upload_id: string
          title: string
          format: string | null
          platform: string | null
          shoot_date: string | null
          location: string | null
          raw_json: Json | null
        }
        Insert: {
          id?: string
          upload_id: string
          title: string
          format?: string | null
          platform?: string | null
          shoot_date?: string | null
          location?: string | null
          raw_json?: Json | null
        }
        Update: {
          id?: string
          upload_id?: string
          title?: string
          format?: string | null
          platform?: string | null
          shoot_date?: string | null
          location?: string | null
          raw_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "prowee_listings_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "prowee_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      prowee_matches: {
        Row: {
          id: string
          listing_id: string
          person_id: string
          client_id: string
          relationship_id: string
          heat_level_at_match: Database["public"]["Enums"]["heat_level"]
          recommended_action: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          person_id: string
          client_id: string
          relationship_id: string
          heat_level_at_match: Database["public"]["Enums"]["heat_level"]
          recommended_action?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          person_id?: string
          client_id?: string
          relationship_id?: string
          heat_level_at_match?: Database["public"]["Enums"]["heat_level"]
          recommended_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prowee_matches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "prowee_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prowee_matches_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prowee_matches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prowee_matches_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      prowee_uploads: {
        Row: {
          id: string
          issue_number: number
          upload_date: string
          pdf_url: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          issue_number: number
          upload_date: string
          pdf_url: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          issue_number?: number
          upload_date?: string
          pdf_url?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      reels: {
        Row: {
          id: string
          client_id: string
          genre_label: string
          url: string
          notes: string | null
          display_order: number
          deleted_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          genre_label: string
          url: string
          notes?: string | null
          display_order?: number
          deleted_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          genre_label?: string
          url?: string
          notes?: string | null
          display_order?: number
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          id: string
          client_id: string
          person_id: string
          heat_level: Database["public"]["Enums"]["heat_level"] | null
          relationship_type: string | null
          how_we_met: string | null
          notes: string | null
          last_contact_date: string | null
          follow_up_reminder: string | null
          created_from_credit: boolean
          email: string | null
          phone: string | null
          agent_rep_info: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          person_id: string
          heat_level?: Database["public"]["Enums"]["heat_level"] | null
          relationship_type?: string | null
          how_we_met?: string | null
          notes?: string | null
          last_contact_date?: string | null
          follow_up_reminder?: string | null
          created_from_credit?: boolean
          email?: string | null
          phone?: string | null
          agent_rep_info?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          person_id?: string
          heat_level?: Database["public"]["Enums"]["heat_level"] | null
          relationship_type?: string | null
          how_we_met?: string | null
          notes?: string | null
          last_contact_date?: string | null
          follow_up_reminder?: string | null
          created_from_credit?: boolean
          email?: string | null
          phone?: string | null
          agent_rep_info?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["user_role"]
          client_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: Database["public"]["Enums"]["user_role"]
          client_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          client_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      auto_create_relationships: {
        Args: { p_credit_id: string }
        Returns: undefined
      }
    }
    Enums: {
      award_result: "Won" | "Nominated"
      client_role_type: "Composer" | "Music Supervisor" | "Music Editor" | "Other"
      company_type: "Production Company" | "Studio" | "Network" | "Streamer" | "Agency" | "Other"
      content_status: "draft" | "published"
      heat_level: "Cold" | "Warm" | "Hot" | "Direct Collaborator"
      project_category: "Film" | "TV" | "Games" | "Theatre" | "Other"
      project_company_role: "Production Company" | "Studio" | "Network" | "Distributor" | "Other"
      project_status: "In Production"
      submitted_by_type: "admin" | "client"
      user_role: "admin" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
