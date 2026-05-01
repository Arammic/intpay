# IntPay — Infrastructure Assumptions, MVP Constraints & Tech Stack

> [!abstract] Purpose
> This document records **explicit architectural and operational assumptions** for the IntPay MVP. It is written to align engineering, compliance stakeholders, and partners on what is **in scope**, what is **deferred**, and what **must be validated** before a production-grade launch. None of these choices replace legal, licensing, or scheme-partner obligations.

---

## Research synthesis (industry patterns relevant to MVP)

Cross-cutting themes from contemporary FinTech MVP practice (aggregated from public guidance on FinTech MVP delivery, RegTech integration, and card-program onboarding):

| Theme | Typical MVP pattern | Implication for IntPay |
|-------|---------------------|-------------------------|
| **KYC/AML depth** | Risk-based scoping; heavy reliance on **specialized identity and screening vendors** rather than bespoke verification stacks | MVP targets **integration contracts** and **audit trails**; full in-house identity engineering is out of scope. |
| **Compliance posture** | “Compliance as foundation”: workflows and logs designed early, even when automation is partial | Governance flows (e.g., invoice proof, declines, freezes) should remain **traceable** and **replayable** from stored artifacts and audit logs. |
| **Payment scope reduction** | **Single golden path** (one issuance → authorization → settlement story) before expanding corridors | JIT funding and virtual-card lifecycle stay tightly bounded until validated with sandbox → controlled production pilots. |
| **Sandbox realism** | Sandboxes validate API wiring; **small-value production pilots** often remain necessary for issuer/settlement edge cases | Assumption that sandbox parity with production is **good but not absolute**—budget time for issuer-specific reconciliation checks. |
| **Sensitive data** | **Tokenization** via PCI-scoped processors to shrink PCI DSS footprint | PAN-like fields in demos must not be mistaken for production PAN handling; production relies on issuer/token APIs (e.g., Stripe Issuing patterns). |

> [!tip] Reading guide
> Sections **A–C** are normative for this repository’s MVP narrative. The table above is **context only**—adapt thresholds and vendors to your licensed jurisdictions and sponsor-bank requirements.

---

## A. Technology stack

| Layer | Choice | Role in IntPay |
|-------|--------|----------------|
| **Frontend** | **React 19** | Client applications structured around **Swiss Design** principles: clear hierarchy, disciplined typography, generous whitespace, and predictable grids—supporting trust-oriented financial UX without ornamental noise. |
| **Backend** | **.NET 10** Minimal APIs | Host exposes HTTP endpoints (`Program`-centric bootstrap in this repo: `net10.0`). **N-Tier** separation (HTTP edge → application/services → data access) and **Clean Architecture** discipline (domain/application boundaries, dependency inversion) keep issuance logic testable as integrations grow. |
| **Database & real-time** | **Supabase (PostgreSQL)** | Authoritative relational store, migrations, and (where enabled) **real-time** and **triggers** for lifecycle or audit-adjacent events. Aligns API projections with durable transactional state. |
| **AI engine** | **LLM integrations** (e.g., **Google Gemini**, **Groq**-hosted models) | **Automated invoice / receipt verification** and auxiliary extraction—not a substitute for legal adjudication or regulatory filings. Outputs feed governance workflows with human-readable rationales where required. |
| **Payments / issuance** | **Stripe API** (Issuing / treasury patterns as applicable) | **Virtual card issuance** and **JIT (Just-In-Time) funding** assumptions anchor on Stripe’s issuer-facing primitives and dashboards unless superseded by a different BIN sponsor. |

> [!note] Repo footprint vs. full vision
> This workspace currently centres on the **API host** (`IntPay.Api`, Supabase client, OpenAPI assets). Frontend applications and LLM worker deployments may live in sibling repositories or deployment pipelines—the stack table describes the **intended system**, not every folder present on disk.

---

## B. Infrastructure assumptions

### Connectivity & hosting

| Assumption | Rationale | MVP caveat |
|------------|-----------|------------|
| API tier runs on a **scalable cloud** provider with **stable egress** to Supabase, Stripe, and LLM endpoints | Predictable latency for synchronous issuance and authorization demos | Cold-start budgets and regional pinning must be tested before demos under constrained networks |

> [!warning] Single-region realism
> Global HA and multi-active failover are **not** implied by the MVP. Document primary region and backup posture separately before regulated workloads.

### Security & transport

| Assumption | Rationale | MVP caveat |
|------------|-----------|------------|
| **TLS terminates at the load balancer / ingress** (TLS 1.2+), with optional end-to-end patterns layered later | Standard SaaS pattern; reduces bespoke certificate sprawl on app nodes | mTLS to upstream processors may become mandatory under sponsor agreements |

### Secrets & configuration

| Assumption | Rationale | MVP caveat |
|------------|-----------|------------|
| API keys (Stripe, Supabase service role, LLM providers) reside in **managed secret stores** or cloud equivalents—not committed source | Prevents leakage via repos or snapshots | Rotate credentials when staffing changes |

### Database isolation & authorization

| Assumption | Rationale | MVP caveat |
|------------|-----------|------------|
| **Supabase Row Level Security (RLS)** contributes **tenant / profile isolation** for client-facing paths where policies are defined | Defense-in-depth for PostgREST and anon/authenticated roles | The companion API currently applies **application-layer authorization** for sensitive flows (caller-supplied `actingUserId` patterns)—RLS policies must be explicitly authored and reviewed for parity |

> [!warning] RLS is not implicit trust
> RLS policies **must be enumerated per table/view**. Assuming isolation without verified policies is a production blocker.

### Observability

| Assumption | Rationale | MVP caveat |
|------------|-----------|------------|
| Structured logs and traces flow from API tier and outbound integrations | Supports investigations after declines or JIT anomalies | LLM prompts/responses may require **PII redaction** policies before central logging

---

## C. MVP governance assumptions (“ready-for-market” logic)

These assumptions deliberately narrow MVP liability while preserving **upgrade paths**. Treat each bullet as a **hypothesis** until validated with counsel and issuer partners.

### Identity — KYC / AML

| Assumption | Details |
|------------|---------|
| **Third-party KYC** | Identity proofing (document capture, liveness where needed), watchlists/sanctions screening, and **risk tiering** are delegated to a regulated-ready vendor **or** a **controlled mock** in synthetic demos only. |
| **AML monitoring cadence** | MVP favors vendor dashboards + webhook/event ingestion into audit pipelines rather than bespoke AML scoring engines. |
| **No in-house identity graph** | No assumption that IntPay operates its own golden-source identity ledger beyond profiles synced from onboarding workflows. |

> [!note] Mock vs. production boundary
> A **mock KYC service** is acceptable **only** in segregated environments. Production onboarding requires contractual clarity with processors and banks regarding liability splits.

### Banking ledger — authority vs. shadow

| Assumption | Details |
|------------|---------|
| **Master ledger** | Balances material to scheme/settlement (issuer-visible obligations, holds, refunds tied to networks) remain **authoritative at Stripe / issuer** boundaries unless explicitly mirrored elsewhere. |
| **Shadow ledger** | IntPay maintains an internal projection (**intent commitments**, governance locks, audit logs, reconciliation checkpoints) used for **product UX**, **analytics**, and **dispute narratives**. Numeric parity must be periodically reconciled to issuer exports—not assumed bitwise identical without tooling. |

### Invoice compliance & AI governance

| Assumption | Details |
|------------|---------|
| **Evidence ingestion** | Users can submit invoice proof via **camera capture or file upload** (JPEG/PDF patterns acceptable subject to malware scanning upstream). |
| **Human escalation path** | LLM-assisted decisions surface structured decline reasons and optionally queues for manual override until automation thresholds pass QA. |
| **Non-determinism** | MVP acknowledges LLM variance—golden-path regression suites combine deterministic fixtures with staged sampling reviews.

---

## Deferred concerns (explicit non-assumptions for MVP)

| Area | MVP stance |
|------|------------|
| Multi-country licensing matrix | Single corridor until counsel expands footprint |
| On-prem HSM key ceremonies | Cloud KMS acceptable under MVP processor delegation |
| Real-time streaming reconciliation | Batch reconciliation adequate during pilots |

---

## References & further reading (external)

Industry-facing summaries consulted for MVP structuring themes:

- [How To Build A FinTech MVP: A Practical Guide (2025 framing)](https://volo.global/blog/fintech-mvp-development)
- [FinTech MVP: Compliance / Security Foundations](https://vivasoftltd.com/mvp-development-for-fintech/)
- [FinTech Weekly — AML/KYC culture](https://www.fintechweekly.com/magazine/articles/fintech-aml-kyc-compliance-culture)
- [Payment platforms — KYC requirements overview](https://wallester.com/blog/business-insights/kyc-requirements-for-payment-platforms-a-compliance-guide)

---

## Document control

| Field | Value |
|-------|--------|
| Audience | Engineering leads, solutions architects, compliance liaisons |
| Status | MVP assumptions — subject to issuer/partner DPA and local regulation |
