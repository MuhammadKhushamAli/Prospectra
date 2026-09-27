# Prospectra: Client Hunter Agent

An autonomous lead generation and personalized outreach system built with AI agents and a human-in-the-loop mobile approval workflow. Prospectra discovers high-intent freelance leads matched to specific technical skills, enriches company data, and drafts highly personalized cold outreach emails—pausing for human approval via a React Native mobile app before dispatch.

## System Architecture

The pipeline operates on a "Skill Catalog" foundation and utilizes LangGraph to manage state and pausing (interrupts) for human review.

1. **Skill Catalog:** Pre-defined offerings mapped to target company profiles, search signals, and past proof-of-work.
2. **Agent 1 (Company Finder):** A LangGraph workflow that executes parallel searches across LinkedIn and the open web (via Tavily), merges and deduplicates results by domain, and scores fit against the skill catalog.
3. **Queue Refill System:** Background cron jobs and database webhooks ensure the lead queue stays topped up to a defined threshold.
4. **Mobile Approval (Phase 1):** Users receive push notifications via Expo and approve or reject newly discovered companies directly in the mobile app.
5. **Agent 2 (Email Writer):** Upon approval, this agent drafts a personalized email using the company's enrichment data, the specific matched skill, and a relevant proof-point project.
6. **Mobile Approval (Phase 2):** Users review, edit, and approve the finalized draft.
7. **Dispatch & Tracking:** Emails are dispatched via Resend/Postmark on a dedicated outreach domain. Webhooks track opens and replies, updating the Supabase database in real-time[cite: 1].

## Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Database & Auth** | Supabase (Postgres) | Central state, multi-tenant Row Level Security (RLS), User Auth, and Realtime WebSocket subscriptions[cite: 1]. |
| **Agent Backend** | Python, FastAPI, LangGraph | Manages AI tool calling, parallel API execution, and graph interruptions for mobile approvals[cite: 1]. |
| **Mobile Client** | React Native, Expo | Human-in-the-loop dashboard with biometric unlock, secure token storage, and real-time queues[cite: 1]. |
| **Data Access** | SQLModel (Python), generated TypeScript (Mobile) | Type-safe database querying and schema validation[cite: 1]. |
| **Enrichment & Search** | Apollo.io, Tavily | Company discovery, contact enrichment, and web signal scraping[cite: 1]. |
| **Email Infrastructure** | Resend / Postmark | High-deliverability transactional email API with reply-tracking webhooks[cite: 1]. |
| **Local Infrastructure** | Docker, Docker Compose, Tailscale | Containerized local backend environment accessible securely via a mesh VPN[cite: 1]. |

## Repository Structure

```text
prospectra/
├── apps/
│   ├── mobile/                        # React Native (Expo) frontend
│   │   ├── app/                       # Expo Router screens
│   │   ├── hooks/                     # Realtime Supabase subscriptions
│   │   └── types/                     # Auto-generated Supabase schema types
│   └── agents/                        # Python FastAPI backend & AI Agents
│       ├── app/api/routes/            # REST endpoints and webhooks
│       ├── app/agents/                # LangGraph workflows (Agent 1 & Agent 2)
│       └── app/models/                # SQLModel definitions matching Postgres tables
├── supabase/
│   ├── migrations/                    # Source-of-truth SQL schema and RLS policies
│   └── seed.sql                       # Dummy data and default catalog setups
├── docker-compose.yml                 # Local orchestrator for Agent API
└── docs/                              # Architecture specs and development guides