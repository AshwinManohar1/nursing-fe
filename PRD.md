# ShiftWise Copilot — Product Requirements Document

## 1. Problem Statement

Nurse scheduling is the single most expensive, most fragile, and most human-sensitive operational process in a hospital — and it's been broken for 40 years.

- 28M nurses globally, 4.5M in the US, 3.3M in India — the largest healthcare workforce on Earth
- Nurse managers spend ~20 hrs/week manually building rosters in Excel + WhatsApp (60–70% of mid-size hospitals)
- 22–27% annual turnover (US) and 30–40% in Indian private hospitals; scheduling dissatisfaction is a top-3 driver
- Every extra patient per nurse = +7% patient mortality — bad schedules kill people
- Legacy tools (Kronos, Symplr, UKG) are 20-year-old rules engines that treat nurses as interchangeable units

The real problem isn't optimization — it's that no system treats nurses like humans with lives, and no system explains why a shift was assigned.

## 2. Target Users

| Persona | Pain Today |
| --- | --- |
| Nurse Manager / Ward In-charge | Spends 20 hrs/week building rosters; fields constant swap requests; blamed when staff quit |
| Staff Nurse | No voice in preferences; can't see why they got a shift; swaps happen over WhatsApp |
| Hospital CFO / COO | Bleeding $5–9M/year on turnover + $24B industry-wide on travel nurses (US); no visibility into fairness |

## 3. Solution

**Shiftwise Copilot** — an AI-native, preference-aware scheduling platform where nurses talk to the system and managers negotiate with it.

### Core capabilities

- **Conversational preference capture** — "I need Tuesday off for my daughter's recital" → structured constraint, no form-filling
- **AI-generated rosters** with hard constraints (labor law, licensing, ratios) and soft optimization (fairness, continuity, preferences)
- **Explainable assignments** — every shift comes with a plain-English rationale ("You got this night because you prefer weekdays and haven't worked nights in 10 days")
- **Real-time disruption handling** — sick call at 3 AM → 3 ranked swap suggestions with minimal-disruption scoring
- **Fairness dashboard** — track "shift desirability index" per nurse over time; publish it to build trust
- **Manager Copilot sidebar** — natural-language roster editing ("move Priya off nights this week, she's on her 5th in a row")

### What makes it different

- **LLM-first, not optimizer-first** — the solver is commodity; the conversation is the moat
- **Nurse-centric UX** — consumer-grade mobile experience vs. legacy desktop-only tools
- **Explainability as a first-class feature** — trust drives adoption, not accuracy

## 4. Success Metrics

| Metric | Target |
| --- | --- |
| Time saved per manager per week | ≥ 15 hrs (from 20 → ≤ 5) |
| Nurse scheduling satisfaction (NPS) | +30 points vs. baseline |
| Voluntary turnover reduction | ≥ 2 percentage points |
| Agency / overtime spend reduction | ≥ 10% |
| Swap requests resolved in < 10 min | ≥ 80% |

## 5. Business Impact

### Per-hospital impact (300-bed reference hospital)

- **$500K–$1.5M/yr** saved from reduced turnover (2 pp × 300 nurses × $50K replacement cost)
- **$300K–$800K/yr** saved from lower agency/overtime spend
- **$150K+/yr** recovered in manager productivity (15 hrs × 50 wks × $200/hr loaded)
- **Patient safety upside** — fewer understaffing incidents, measurable via HAI and mortality metrics

### Market opportunity

- **TAM:** $6B global healthcare workforce management by 2030
- **SAM:** $2B mid-to-large hospital nurse scheduling (US + India + UK)
- **SOM (3-yr):** 50 Indian hospitals @ ~$100K ARR = $5M ARR; expand to US at 5× per-hospital pricing

### Why now

- **Shortage crisis** — WHO projects 10M healthcare worker gap by 2030; hospitals can't hire their way out → retention is existential
- **LLM unlock** — preference capture and explainability only became tractable in the last 24 months
- **CFO urgency** — post-COVID, cutting agency nurse spend is the #1 ops priority in US health systems

## 6. Scope for Hackathon Demo (MVP)

### In scope

- Login + role-based views (Admin, Ward In-charge, Nurse)
- AI-generated roster for n ward, 1 week, ~m nurses
- Conversational preference entry (chat with Copilot)
- Explainable shift assignments (hover → "why this shift?")
- One swap flow with AI-ranked alternatives
- Fairness dashboard (simple desirability index)

### Out of scope (post-hackathon)

- Payroll integration, biometric attendance, multi-hospital tenancy, regulatory compliance certs (NABH/HIPAA), mobile native app

## 7. Risks & Open Questions

| Risk | Mitigation |
| --- | --- |
| Hospitals slow to adopt AI in clinical ops | Position as manager productivity tool first, not clinical AI |
| Labor law complexity varies by state/country | Start with 2 geographies (India + 1 US state); configurable rules engine |
| Trust gap with nurses | Explainability + fairness dashboard from day 1 |
| Incumbents (UKG, Symplr) bundle scheduling into EHR deals | Sell as best-of-breed layer; integrate via API |

## 8. The One-Line Pitch

> "Shiftwise Copilot turns the Sunday-night Excel nightmare into a 15-minute conversation — saving hospitals millions, keeping nurses in the profession, and keeping patients safer."
