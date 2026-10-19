export interface Proposal {
  id: string;
  client_name: string;
  client_company: string;
  client_domain?: string;
  client_email?: string;
  service_name?: string;
  plan_name?: string;
  start_date?: string;
  duration?: string;
  price?: number;
  invoice_number: string;
  payment_status: string; // 'PAGADO' | 'PARCIAL' | 'PENDIENTE'
  payment_date?: string;
  payment_method?: string;
  payment_amount?: number;
  domain_included?: number;
  domain_expiration?: string;
  service_expiration?: string;
  suspension_date?: string;
  signature_image?: string | null;
  signature_date?: string | null;
  created_at: string;
  category_name?: string;
  features?: string;
  brand_color_primary?: string;
  brand_color_secondary?: string;
  brand_logo_url?: string;
  grace_days?: number;
  late_fee_percentage?: number;
  daily_penalty_fee?: number;
}

export interface ProposalService {
  id?: string;
  proposal_id?: string;
  category_name: string;
  service_name: string;
  plan_name: string;
  price: number;
  billing_type: 'RECURRENT' | 'ONE_TIME';
  billing_cycle?: string;
  features: string;
  policies?: string;
  category_policies?: string;
  status?: string;
  start_date?: string;
  expiration_date?: string;
  suspension_date?: string;
  domain_included?: number;
  domain_expiration?: string;
}

export interface ProposalPayment {
  id?: string;
  proposal_id?: string;
  invoice_number?: string;
  amount: number;
  payment_date?: string;
  payment_method?: string;
  description?: string;
  status?: string;
  notes?: string;
  due_date?: string;
}

export interface Credential {
  id?: number | string;
  proposal_id?: string;
  description: string;
  email: string;
  password: string;
  notes?: string;
  dynamic_fields?: string;
}

export interface ProposalCollaborator {
  id?: string;
  proposal_id?: string;
  name: string;
  role?: string;
  logo_url?: string;
  contact?: string;
}

export interface CatalogCategory {
  id: string;
  name: string;
  policies?: string;
  services?: CatalogService[];
}

export interface CatalogService {
  id: string;
  category_id: string;
  name: string;
  plans?: CatalogServicePlan[];
}

export interface CatalogServicePlan {
  id: string;
  service_id: string;
  name: string;
  price: number;
  duration?: string;
  features?: string;
  policies?: string;
}

export interface BrandSettings {
  brand_name: string;
  brand_logo: string;
  color_primary: string;
  color_secondary: string;
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_pass?: string;
}
