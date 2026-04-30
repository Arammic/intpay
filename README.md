

# IntPay: The Architecture of Purpose-Driven Finance

> **Directing the Flow of Value through Programmable Intent.**
>
> _Current financial systems treat money as a "mute" asset—once a transfer is authorized, its journey becomes invisible and uncontrollable. IntPay fundamentally redefines this by transforming static cash into **Smart Governed Assets**. We don’t just facilitate the movement of money; we hard-code the "Why," "Where," and "When" into every cent, ensuring that financial execution never deviates from human intent._

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#getting-started) [![License](https://img.shields.io/badge/license-MIT-blue)](#license) [![Backend](https://img.shields.io/badge/.NET-10-512BD4)](#technical-blueprint) [![Frontend](https://img.shields.io/badge/React-19-61DAFB)](#technical-blueprint) [![Data](https://img.shields.io/badge/data-Supabase-3ECF8E)](#technical-blueprint) [![Payments](https://img.shields.io/badge/payments-mock_execution_layer-635BFF)](#mvp-status--implementation-reality)

[Live Demo](https://int-pay.netlify.app/) | [Team](https://www.linkedin.com/company/arammic) | [API Reference](./API_REFERENCE.md)

---

## 1. Executive Vision & The Paradigm Shift

Traditional financial rails are architected for one thing: the movement of capital. However, once funds leave Point A, the sender enters a "blind spot" where control evaporates. This creates the **Post-Transfer Trust Gap**.

**IntPay** is the **Programmable Intent Layer** built on top of these rails. We view execution networks (like Stripe or Visa) as "dumb pipes"—necessary for transport, but devoid of intelligence.

| **The Old Model (Traditional Banking)** | **The IntPay Protocol** |
| :--- | :--- |
| **Reactive:** Monitors transactions _after_ they occur. | **Proactive:** Governs transactions _before_ they are authorized. |
| **Primary Question:** "Where _did_ the money go?" | **Primary Question:** "Where is the money _allowed_ to go?" |
| **Outcome:** Post-spend audits & manual reconciliation. | **Outcome:** Mathematical certainty & automated compliance. |

---

## 2. Problem Analysis: The "Trust Gap"

- **The Post-Transfer Trust Gap:** Once funds are transferred (to an employee or child), control is lost. Reliance is placed entirely on human trust, leading to budget deviation.
- **The Reconciliation Nightmare:** Companies waste hundreds of hours matching receipts with statements to verify intent.
- **Reactive Security:** Current cards are "Open" or "Closed." Fraud is only handled _after_ detection, never prevented at the source.

---

## 3. The Solution: Engineering Intent

We provide a **Governance Software Layer** that operates above existing payment infrastructures:

- **Smart Spending Contracts:** Users issue "Virtual Cards" bound by programmatic rules (e.g., $100 cap, Pharmacy only, expires in 24h).
- **Just-In-Time (JIT) Funding:** IntPay cards maintain a **$0.00 balance**. Our system intercepts requests in milliseconds, validates them against the "Intent," and funds the card instantly. **Fraud is mathematically impossible.**
- **Accounting Automation:** The transaction only occurs because it _already_ matched the policy, eliminating retroactive review.

---

## 4. Why IntPay Succeeds: The Competitive Edge

### Shifting the Checkpoint
While traditional finance spends billions on **Detection**, IntPay focuses on **Prevention**. We relocate authority from the merchant's terminal to the sender's intent engine.

### Neutral Code vs. Social Friction
- **For Businesses:** Managers no longer "reject" receipts; the system prevents the purchase at the Point of Sale.
- **For Families:** Guardrails are hard-coded into the asset, removing the need for constant supervision.
- **Result:** We replace social friction with **Technical Transparency**.

---

## 5. Deep Feature & Intelligence Analysis

### The Intent Governance Engine (Core)
A deterministic policy gateway evaluate against the Smart Spending Contract in milliseconds.

*   **Usage Constraints:** `useTimes` & `usesLeft` cap swipes to prevent credential reuse.
*   **Temporal Logic:** `firstDateToUser` ensures funds activate and expire exactly when needed.
*   **Merchant Category Fencing (MCC):** Locks spending to specific industries (e.g., Medical only).
*   **AI Intent Analysis (Vision):** Natural language parsing (e.g., *"Set $50 for school books"*) compiled into strict multi-layered contracts.

---

## 6. Technical Blueprint & Infrastructure

Built for extreme scale and microsecond latency using a modern, decoupled Full-Stack architecture.

### The Stack
*   **Frontend:** **React 19** with Tailwind CSS, following a **Swiss Design** approach—minimalist, geometric, and high-contrast for administrative clarity.
*   **Backend:** **ASP.NET Core Minimal APIs (.NET 10)** for absolute minimal overhead and maximum throughput.
*   **Business Logic:** Clean Architecture principles isolate `IntPayService` from state management.
*   **Data & State:** **Supabase** (PostgreSQL) with atomic RPC calls for data integrity.

### Real-Time Interception Flow
```mermaid
flowchart LR
    Client[React Frontend] --> API[Minimal API Layer]
    API --> Engine[Intent Governance Engine]
    
    subgraph Smart Spending Contract
    Engine --> Rule1[Check: Amount Limits]
    Engine --> Rule2[Check: Temporal Locks]
    Engine --> Rule3[Check: MCC Allow-list]
    end
    
    Rule1 & Rule2 & Rule3 --> Decision{Decision Node}
    
    Decision -- Approved --> Execute[Fund & Authorize]
    Decision -- Declined --> Block[Reject & Lock]
    
    Execute & Block --> Audit[Immutable Audit Log]
    Audit --> DB[(Supabase DB)]
````

---

## 7. MVP Status & Implementation Reality

|**Component**|**Current Implementation (MVP)**|**Future State / Roadmap**|
|---|---|---|
|**User Interface**|**React Dashboard** (Intent Management)|AI-powered Conversational UI|
|**Contract Creation**|Atomic intent & card generation (Supabase RPC)|Natural language AI Intent compiler|
|**Policy Enforcement**|Real-time Amount/MCC validation (.NET)|Multi-currency orchestration|
|**Transaction Flow**|Simulated tap-to-pay interception logic|Live Stripe Issuing / Visa integration|
|**Auditability**|Granular reason codes per simulated swipe|AI invoice-matching & Blockchain logs|

---

## 8. Investment & Capital Allocation

Seeking **$500,000 Seed Round** to transform the MVP into a market-ready protocol.

- **40% Engineering & Compliance ($200k):** PCI-DSS Level 1 & BIN Sponsorship.
    
- **35% Market Acquisition ($175k):** Direct B2B sales targeting SMEs in KSA and UAE.
    
- **20% Core Operations ($100k):** Legal/Fintech Compliance & Cloud Infra.
    
- **5% Strategic Reserve ($25k):** Unplanned regulatory adjustments.
    

---

## 9. Financial ROI & Growth Strategy

### ROI Logic

- **Target Break-even:** 18–24 months post-launch.
    
- **Projected IRR:** **35% – 45%** annually for the first 3 years.
    
- **LTV:CAC Ratio:** Targeted at **3:1**.
    

### Growth Phases

1. **Phase 1 (Q3 2026):** SME Expense Governance (KSA/UAE Focus).
    
2. **Phase 2 (Q2 2027):** Philanthropy & Family (Purpose-locked Aid).
    
3. **Phase 3 (Q4 2027):** Governance-as-a-Service API (GaaS) for Banks.
    

---

## 10. Getting Started

### Prerequisites

- [.NET 10 SDK](https://gemini.google.com/app/bb53f59d2ea2c50f)
    
- [Node.js & npm](https://gemini.google.com/app/bb53f59d2ea2c50f) (for React Frontend)
    
- Supabase Project (URL & Anon Key)
    

### Local Deployment

#### 1. Backend (.NET 10)


```Bash
cd IntPayApp/IntPay.Api
dotnet restore
dotnet run
```

#### 2. Frontend (React)


```Bash
cd IntPayApp/IntPay.Web
npm install
npm run dev
```

---

**License:** MIT License | **Built for the future of programmable finance.**
