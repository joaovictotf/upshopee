export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      boost_campaigns: {
        Row: {
          approved_by: string | null
          created_at: string
          ends_at: string
          id: string
          internal_note: string | null
          is_demo: boolean
          pack_id: string
          pack_name: string
          pack_value: number
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          ends_at: string
          id?: string
          internal_note?: string | null
          is_demo?: boolean
          pack_id: string
          pack_name: string
          pack_value: number
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          internal_note?: string | null
          is_demo?: boolean
          pack_id?: string
          pack_name?: string
          pack_value?: number
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      boost_simulated_events: {
        Row: {
          campaign_id: string
          commission: number
          created_at: string
          id: string
          is_demo: boolean
          product_image: string | null
          product_name: string
          product_row_id: string | null
          released_at: string | null
          sales_order_id: string | null
          scheduled_at: string
          source: string
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          commission: number
          created_at?: string
          id?: string
          is_demo?: boolean
          product_image?: string | null
          product_name: string
          product_row_id?: string | null
          released_at?: string | null
          sales_order_id?: string | null
          scheduled_at: string
          source?: string
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          commission?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          product_image?: string | null
          product_name?: string
          product_row_id?: string | null
          released_at?: string | null
          sales_order_id?: string | null
          scheduled_at?: string
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_simulated_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "boost_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_lightning_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          source?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          created_at: string
          demo_expires_at: string | null
          email: string
          full_name: string
          is_demo: boolean
          phone: string | null
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          demo_expires_at?: string | null
          email: string
          full_name: string
          is_demo?: boolean
          phone?: string | null
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          demo_expires_at?: string | null
          email?: string
          full_name?: string
          is_demo?: boolean
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      registration_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          plan_type: string
          status: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          plan_type: string
          status?: string
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          plan_type?: string
          status?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      sales_orders: {
        Row: {
          commission: number
          created_at: string
          customer_email_masked: string | null
          customer_location: string | null
          customer_name: string | null
          customer_phone_masked: string | null
          id: string
          is_demo: boolean
          marketplace: string
          marketplace_fee: number
          operational_cost: number
          product_image: string | null
          product_local_id: string | null
          product_name: string
          product_remote_id: string | null
          product_row_id: string | null
          sale_price: number
          source: string | null
          status: string
          supplier_cost: number
          supplier_location: string | null
          supplier_name: string | null
          user_id: string
        }
        Insert: {
          commission?: number
          created_at?: string
          customer_email_masked?: string | null
          customer_location?: string | null
          customer_name?: string | null
          customer_phone_masked?: string | null
          id?: string
          is_demo?: boolean
          marketplace: string
          marketplace_fee?: number
          operational_cost?: number
          product_image?: string | null
          product_local_id?: string | null
          product_name: string
          product_remote_id?: string | null
          product_row_id?: string | null
          sale_price?: number
          source?: string | null
          status?: string
          supplier_cost?: number
          supplier_location?: string | null
          supplier_name?: string | null
          user_id: string
        }
        Update: {
          commission?: number
          created_at?: string
          customer_email_masked?: string | null
          customer_location?: string | null
          customer_name?: string | null
          customer_phone_masked?: string | null
          id?: string
          is_demo?: boolean
          marketplace?: string
          marketplace_fee?: number
          operational_cost?: number
          product_image?: string | null
          product_local_id?: string | null
          product_name?: string
          product_remote_id?: string | null
          product_row_id?: string | null
          sale_price?: number
          source?: string | null
          status?: string
          supplier_cost?: number
          supplier_location?: string | null
          supplier_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_marketplace_connections: {
        Row: {
          id: string
          marketplace: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["connection_status"]
          user_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          id?: string
          marketplace: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["connection_status"]
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          id?: string
          marketplace?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["connection_status"]
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      user_products: {
        Row: {
          category: string | null
          created_at: string
          current_step: string
          estimated_commission: number | null
          id: string
          image: string | null
          local_id: string
          marketplaces: string[]
          name: string
          product_id: string | null
          recommended_price: number | null
          status: string
          supplier_cost: number | null
          supplier_location: string | null
          supplier_name: string | null
          user_id: string
          validated_at: string | null
          validated_by: string | null
          validation_status: Database["public"]["Enums"]["product_validation_status"]
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_step?: string
          estimated_commission?: number | null
          id?: string
          image?: string | null
          local_id: string
          marketplaces?: string[]
          name: string
          product_id?: string | null
          recommended_price?: number | null
          status?: string
          supplier_cost?: number | null
          supplier_location?: string | null
          supplier_name?: string | null
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: Database["public"]["Enums"]["product_validation_status"]
        }
        Update: {
          category?: string | null
          created_at?: string
          current_step?: string
          estimated_commission?: number | null
          id?: string
          image?: string | null
          local_id?: string
          marketplaces?: string[]
          name?: string
          product_id?: string | null
          recommended_price?: number | null
          status?: string
          supplier_cost?: number | null
          supplier_location?: string | null
          supplier_name?: string | null
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: Database["public"]["Enums"]["product_validation_status"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          created_at: string
          holder_name: string
          id: string
          internal_note: string | null
          pix_key: string
          pix_key_type: string
          requested_amount: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          holder_name: string
          id?: string
          internal_note?: string | null
          pix_key: string
          pix_key_type: string
          requested_amount: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          holder_name?: string
          id?: string
          internal_note?: string | null
          pix_key?: string
          pix_key_type?: string
          requested_amount?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_bulk_demo_commission_shopee: {
        Args: { _commission: number; _note?: string }
        Returns: Json
      }
      admin_cancel_boost_campaign: {
        Args: { _campaign_id: string }
        Returns: undefined
      }
      admin_create_boost_campaign: {
        Args: {
          _note?: string
          _pack_id: string
          _replace?: boolean
          _starts_at?: string
          _user_id: string
        }
        Returns: Json
      }
      admin_create_demo_sale_order: {
        Args: {
          _commission: number
          _customer_email_masked: string
          _customer_location: string
          _customer_name: string
          _customer_phone_masked: string
          _marketplace: string
          _product_row_id: string
          _user_id: string
        }
        Returns: string
      }
      approve_all_pending_accounts: { Args: never; Returns: number }
      approve_user: { Args: { _user_id: string }; Returns: undefined }
      block_user_payment: { Args: { _user_id: string }; Returns: undefined }
      create_withdrawal_request: {
        Args: {
          _amount: number
          _holder_name: string
          _pix_key: string
          _pix_key_type: string
        }
        Returns: string
      }
      cron_auto_approve_pending_accounts: { Args: never; Returns: number }
      cron_auto_approve_pending_connections: { Args: never; Returns: number }
      grant_presentation_admin: {
        Args: { _user_id: string }
        Returns: undefined
      }
      has_lightning_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_presentation_admins: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      lookup_registration_token: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          id: string
          plan_type: string
          status: string
          token: string
        }[]
      }
      record_lightning_click: { Args: { _amount: number }; Returns: number }
      reject_marketplace_connection: {
        Args: { _marketplace: string; _reason?: string; _user_id: string }
        Returns: undefined
      }
      reject_user: { Args: { _user_id: string }; Returns: undefined }
      release_automatic_demo_sales: {
        Args: { _user_id?: string }
        Returns: number
      }
      release_due_boost_events: { Args: { _user_id?: string }; Returns: number }
      revoke_presentation_admin: {
        Args: { _user_id: string }
        Returns: undefined
      }
      unblock_user_payment: { Args: { _user_id: string }; Returns: undefined }
      upsert_my_product_for_validation: {
        Args: {
          _category: string
          _estimated_commission: number
          _image: string
          _local_id: string
          _marketplaces: string[]
          _name: string
          _product_id: string
          _recommended_price: number
          _supplier_cost: number
          _supplier_location: string
          _supplier_name: string
        }
        Returns: string
      }
      validate_all_pending_connections: { Args: never; Returns: number }
      validate_all_pending_products: { Args: never; Returns: number }
      validate_marketplace_connection: {
        Args: { _marketplace: string; _user_id: string }
        Returns: undefined
      }
      validate_user_pending_connections: {
        Args: { _user_id: string }
        Returns: number
      }
      validate_user_pending_products: {
        Args: { _user_id: string }
        Returns: number
      }
      validate_user_product: {
        Args: { _product_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "presentation_admin"
      approval_status: "pending" | "approved" | "rejected" | "blocked_payment"
      connection_status: "pending_validation" | "approved" | "rejected"
      product_validation_status: "pending_validation" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "presentation_admin"],
      approval_status: ["pending", "approved", "rejected", "blocked_payment"],
      connection_status: ["pending_validation", "approved", "rejected"],
      product_validation_status: ["pending_validation", "approved", "rejected"],
    },
  },
} as const
