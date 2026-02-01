--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2026-01-29 19:45:25

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 17453)
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id text NOT NULL,
    user_id text NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    action text NOT NULL,
    metadata text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 218 (class 1259 OID 17475)
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    project_id text NOT NULL,
    user_id text,
    created_by text,
    status text DEFAULT 'draft'::text,
    total numeric(12,2) DEFAULT '0'::numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 219 (class 1259 OID 17485)
-- Name: job_sites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_sites (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    location text,
    description text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 220 (class 1259 OID 17495)
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id text NOT NULL,
    invoice_id text NOT NULL,
    user_id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    method text,
    reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 221 (class 1259 OID 17503)
-- Name: preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preferences (
    id text NOT NULL,
    user_id text NOT NULL,
    currency text DEFAULT 'USD'::text,
    language text DEFAULT 'en'::text,
    theme text DEFAULT 'light'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 222 (class 1259 OID 17514)
-- Name: project_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_events (
    event_id text NOT NULL,
    project_id text NOT NULL,
    user_id text NOT NULL,
    audio_id text,
    event_type text NOT NULL,
    source text NOT NULL,
    confidence numeric(3,2),
    transcript text,
    data text,
    visible_to_client boolean DEFAULT true,
    approval_status text DEFAULT 'PENDING'::text,
    approved_at timestamp with time zone,
    approval_notes text,
    photos text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    deletion_reason text
);


--
-- TOC entry 223 (class 1259 OID 17525)
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    client_name text,
    address text,
    status text DEFAULT 'active'::text,
    budget numeric(12,2) DEFAULT '0'::numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 224 (class 1259 OID 17535)
-- Name: receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipts (
    id text NOT NULL,
    project_id text NOT NULL,
    user_id text NOT NULL,
    file_name text,
    file_size integer,
    mime_type text,
    cloud_path text,
    is_processed boolean DEFAULT false,
    extracted_data text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 226 (class 1259 OID 17869)
-- Name: scope_proof_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scope_proof_notifications (
    id text NOT NULL,
    scope_proof_id text NOT NULL,
    notification_type text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_via text NOT NULL
);


--
-- TOC entry 227 (class 1259 OID 17877)
-- Name: scope_proofs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scope_proofs (
    id text NOT NULL,
    user_id text NOT NULL,
    project_id text,
    invoice_id text,
    description text NOT NULL,
    estimated_cost numeric(10,2) NOT NULL,
    photos text DEFAULT '[]'::text,
    status text DEFAULT 'pending'::text,
    approval_token text NOT NULL,
    token_expires_at timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 225 (class 1259 OID 17571)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text,
    company_name text,
    company_phone text,
    company_email text,
    company_address text,
    company_website text,
    company_tax_id text,
    current_plan text DEFAULT 'free'::text,
    is_subscribed boolean DEFAULT false,
    subscription_status text DEFAULT 'inactive'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 4897 (class 0 OID 17453)
-- Dependencies: 217
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_log (id, user_id, resource_type, resource_id, action, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 4898 (class 0 OID 17475)
-- Dependencies: 218
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, project_id, user_id, created_by, status, total, created_at) FROM stdin;
\.


--
-- TOC entry 4899 (class 0 OID 17485)
-- Dependencies: 219
-- Data for Name: job_sites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_sites (id, user_id, name, location, description, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4900 (class 0 OID 17495)
-- Dependencies: 220
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, invoice_id, user_id, amount, method, reference, created_at) FROM stdin;
\.


--
-- TOC entry 4901 (class 0 OID 17503)
-- Dependencies: 221
-- Data for Name: preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.preferences (id, user_id, currency, language, theme, created_at) FROM stdin;
\.


--
-- TOC entry 4902 (class 0 OID 17514)
-- Dependencies: 222
-- Data for Name: project_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_events (event_id, project_id, user_id, audio_id, event_type, source, confidence, transcript, data, visible_to_client, approval_status, approved_at, approval_notes, photos, created_at, is_deleted, deleted_at, deletion_reason) FROM stdin;
\.


--
-- TOC entry 4903 (class 0 OID 17525)
-- Dependencies: 223
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, user_id, name, client_name, address, status, budget, created_at) FROM stdin;
58a2e4ed-21a3-449f-a05d-92d47e7772c8	0438e804-082e-4b74-b722-f32db02b2582	Olive Estate	\N	\N	active	0.00	2026-01-21 20:59:53.732+01
\.


--
-- TOC entry 4904 (class 0 OID 17535)
-- Dependencies: 224
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.receipts (id, project_id, user_id, file_name, file_size, mime_type, cloud_path, is_processed, extracted_data, created_at) FROM stdin;
\.


--
-- TOC entry 4906 (class 0 OID 17869)
-- Dependencies: 226
-- Data for Name: scope_proof_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scope_proof_notifications (id, scope_proof_id, notification_type, sent_at, sent_via) FROM stdin;
\.


--
-- TOC entry 4907 (class 0 OID 17877)
-- Dependencies: 227
-- Data for Name: scope_proofs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scope_proofs (id, user_id, project_id, invoice_id, description, estimated_cost, photos, status, approval_token, token_expires_at, approved_at, approved_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4905 (class 0 OID 17571)
-- Dependencies: 225
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password, name, company_name, company_phone, company_email, company_address, company_website, company_tax_id, current_plan, is_subscribed, subscription_status, created_at) FROM stdin;
0438e804-082e-4b74-b722-f32db02b2582	theonyekachithompson@gmail.com	$2b$10$6gf8myGO9PzYtkxqjzfOvOkOca7rLFjFmH5gyCdj8hjal30DzL9Ti	Israel Onyekachi Thompson 	\N	\N	\N	\N	\N	\N	free	f	inactive	2026-01-20 20:58:26.323+01
c919524b-d988-488b-bbc6-8bc259a242a0	testuser@example.com	$2b$10$gtdRBXVtJrcAbjpb3isZouPOTyaWGg6EXdEY7RBxW3k1weZt7rQJC	Test User	\N	\N	\N	\N	\N	\N	free	f	inactive	2026-01-23 16:30:42.101413+01
0ccbef73-1fc8-4d71-8c88-af74c9760665	john@gmail.com	$2b$10$mtmPeWlXjLISFxD486EaZ.8rDUbt6fx0B5kwG8UhjiLwaEuHVzVxu	King John	\N	\N	\N	\N	\N	\N	free	f	inactive	2026-01-23 16:38:24.754211+01
c4e41478-ea54-4d10-bf87-5d85f45fc194	perry@gmail.com	$2b$10$jlXg3A4kQlHie8Gu/RPeoelhcnZR4kf3jYACB8QARQwW4MGcFwVTu	Samuel Perry	\N	\N	\N	\N	\N	\N	free	f	inactive	2026-01-27 13:47:20.926885+01
\.


--
-- TOC entry 4711 (class 2606 OID 17460)
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4713 (class 2606 OID 17484)
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- TOC entry 4715 (class 2606 OID 17494)
-- Name: job_sites job_sites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_sites
    ADD CONSTRAINT job_sites_pkey PRIMARY KEY (id);


--
-- TOC entry 4717 (class 2606 OID 17502)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 4719 (class 2606 OID 17513)
-- Name: preferences preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferences
    ADD CONSTRAINT preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 4721 (class 2606 OID 17524)
-- Name: project_events project_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_events
    ADD CONSTRAINT project_events_pkey PRIMARY KEY (event_id);


--
-- TOC entry 4723 (class 2606 OID 17534)
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- TOC entry 4725 (class 2606 OID 17543)
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 4731 (class 2606 OID 17876)
-- Name: scope_proof_notifications scope_proof_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_proof_notifications
    ADD CONSTRAINT scope_proof_notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4733 (class 2606 OID 17889)
-- Name: scope_proofs scope_proofs_approval_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_proofs
    ADD CONSTRAINT scope_proofs_approval_token_unique UNIQUE (approval_token);


--
-- TOC entry 4735 (class 2606 OID 17887)
-- Name: scope_proofs scope_proofs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_proofs
    ADD CONSTRAINT scope_proofs_pkey PRIMARY KEY (id);


--
-- TOC entry 4727 (class 2606 OID 17583)
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- TOC entry 4729 (class 2606 OID 17581)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4736 (class 2606 OID 17584)
-- Name: activity_log activity_log_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4737 (class 2606 OID 17594)
-- Name: invoices invoices_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 4738 (class 2606 OID 17599)
-- Name: invoices invoices_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4739 (class 2606 OID 17604)
-- Name: job_sites job_sites_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_sites
    ADD CONSTRAINT job_sites_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4740 (class 2606 OID 17609)
-- Name: payments payments_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- TOC entry 4741 (class 2606 OID 17614)
-- Name: payments payments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4742 (class 2606 OID 17619)
-- Name: preferences preferences_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferences
    ADD CONSTRAINT preferences_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4743 (class 2606 OID 17624)
-- Name: project_events project_events_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_events
    ADD CONSTRAINT project_events_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 4744 (class 2606 OID 17629)
-- Name: project_events project_events_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_events
    ADD CONSTRAINT project_events_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4745 (class 2606 OID 17634)
-- Name: projects projects_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4746 (class 2606 OID 17639)
-- Name: receipts receipts_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 4747 (class 2606 OID 17644)
-- Name: receipts receipts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4748 (class 2606 OID 17890)
-- Name: scope_proof_notifications scope_proof_notifications_scope_proof_id_scope_proofs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_proof_notifications
    ADD CONSTRAINT scope_proof_notifications_scope_proof_id_scope_proofs_id_fk FOREIGN KEY (scope_proof_id) REFERENCES public.scope_proofs(id) ON DELETE CASCADE;


--
-- TOC entry 4749 (class 2606 OID 17905)
-- Name: scope_proofs scope_proofs_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_proofs
    ADD CONSTRAINT scope_proofs_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- TOC entry 4750 (class 2606 OID 17900)
-- Name: scope_proofs scope_proofs_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_proofs
    ADD CONSTRAINT scope_proofs_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- TOC entry 4751 (class 2606 OID 17895)
-- Name: scope_proofs scope_proofs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_proofs
    ADD CONSTRAINT scope_proofs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-01-29 19:45:25

--
-- PostgreSQL database dump complete
--

