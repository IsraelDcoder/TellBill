-- Enable Row-Level Security (RLS) on all public tables
-- This prevents unauthorized data access at the database level

-- ============================================
-- USERS TABLE
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view/edit only their own record
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid()::text = id);

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only view/delete their own refresh tokens
CREATE POLICY "Users can access their own refresh tokens"
  ON public.refresh_tokens
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own refresh tokens"
  ON public.refresh_tokens
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only view their own password reset tokens
CREATE POLICY "Users can view their own password reset tokens"
  ON public.password_reset_tokens
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- ============================================
-- PROJECTS TABLE
-- ============================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Users can only access their own projects
CREATE POLICY "Users can view their own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- INVOICES TABLE
-- ============================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Users can only access their own invoices
CREATE POLICY "Users can view their own invoices"
  ON public.invoices
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create invoices"
  ON public.invoices
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own invoices"
  ON public.invoices
  FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON public.invoices
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- RECEIPTS TABLE
-- ============================================
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own receipts
CREATE POLICY "Users can view their own receipts"
  ON public.receipts
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create receipts"
  ON public.receipts
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own receipts"
  ON public.receipts
  FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own receipts"
  ON public.receipts
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own activity logs
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_log
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create activity logs"
  ON public.activity_log
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can only access their own payment records
CREATE POLICY "Users can view their own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create payment records"
  ON public.payments
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- ============================================
-- SCOPE PROOFS TABLE
-- ============================================
ALTER TABLE public.scope_proofs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own scope proofs
CREATE POLICY "Users can view their own scope proofs"
  ON public.scope_proofs
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create scope proofs"
  ON public.scope_proofs
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own scope proofs"
  ON public.scope_proofs
  FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own scope proofs"
  ON public.scope_proofs
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- SCOPE PROOF NOTIFICATIONS TABLE
-- ============================================
ALTER TABLE public.scope_proof_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only access their own notifications
CREATE POLICY "Users can view their own scope proof notifications"
  ON public.scope_proof_notifications
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create scope proof notifications"
  ON public.scope_proof_notifications
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own scope proof notifications"
  ON public.scope_proof_notifications
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- PREFERENCES TABLE
-- ============================================
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can view their own preferences"
  ON public.preferences
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create preferences"
  ON public.preferences
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.preferences
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ============================================
-- MONEY ALERTS TABLE
-- ============================================
ALTER TABLE public.money_alerts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own money alerts
CREATE POLICY "Users can view their own money alerts"
  ON public.money_alerts
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create money alerts"
  ON public.money_alerts
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own money alerts"
  ON public.money_alerts
  FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own money alerts"
  ON public.money_alerts
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- MONEY ALERT EVENTS TABLE
-- ============================================
ALTER TABLE public.money_alert_events ENABLE ROW LEVEL SECURITY;

-- Users can only view money alert events for their alerts
CREATE POLICY "Users can view their money alert events"
  ON public.money_alert_events
  FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT user_id FROM public.money_alerts WHERE id = money_alert_events.alert_id
    )
  );

-- ============================================
-- TAX PROFILES TABLE
-- ============================================
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tax profiles
CREATE POLICY "Users can view their own tax profiles"
  ON public.tax_profiles
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create tax profiles"
  ON public.tax_profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own tax profiles"
  ON public.tax_profiles
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ============================================
-- MATERIAL COST EVENTS TABLE
-- ============================================
ALTER TABLE public.material_cost_events ENABLE ROW LEVEL SECURITY;

-- Users can only view material cost events for their projects
CREATE POLICY "Users can view their material cost events"
  ON public.material_cost_events
  FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT user_id FROM public.projects WHERE id = material_cost_events.project_id
    )
  );

-- ============================================
-- PROJECT EVENTS TABLE
-- ============================================
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

-- Users can only view events for their projects
CREATE POLICY "Users can view their project events"
  ON public.project_events
  FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT user_id FROM public.projects WHERE id = project_events.project_id
    )
  );

-- ============================================
-- JOB SITES TABLE
-- ============================================
ALTER TABLE public.job_sites ENABLE ROW LEVEL SECURITY;

-- Users can only access their own job sites
CREATE POLICY "Users can view their own job sites"
  ON public.job_sites
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create job sites"
  ON public.job_sites
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own job sites"
  ON public.job_sites
  FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own job sites"
  ON public.job_sites
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- WEBHOOK PROCESSED TABLE
-- ============================================
ALTER TABLE public.webhook_processed ENABLE ROW LEVEL SECURITY;

-- Only backend service can access webhook records (no user-level access needed)
-- Create a policy that allows system access but blocks user access
CREATE POLICY "Webhook records are system-only"
  ON public.webhook_processed
  FOR SELECT
  USING (false);

CREATE POLICY "Webhook insert is system-only"
  ON public.webhook_processed
  FOR INSERT
  WITH CHECK (false);
