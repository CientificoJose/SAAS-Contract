export interface AdminUserProposalSummary {
  id: string;
  client_name: string;
  client_company: string;
  client_email: string;
  invoice_number: string;
  price: number;
  payment_amount: number;
  payment_status: string;
  is_signed: boolean;
  signature_date: string | null;
  created_at: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  full_name: string;
  tenant_name: string;
  role: 'admin' | 'user';
  brand_logo_url: string;
  brand_color_primary: string;
  brand_color_secondary: string;
  email_confirmed: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  smtp_configured: boolean;
  payment_methods_count: number;
  proposals_count: number;
  signed_count: number;
  paid_count: number;
  total_quoted: number;
  total_collected: number;
  proposals: AdminUserProposalSummary[];
}

export interface AdminOverviewStats {
  total_users: number;
  total_agencies: number;
  total_proposals: number;
  total_signed: number;
  total_quoted_usd: number;
  total_collected_usd: number;
}

export interface AdminOverviewData {
  stats: AdminOverviewStats;
  users: AdminUserRecord[];
  adminEmailConfigured: string;
}
