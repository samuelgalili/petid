# 🛡️ PetID: The Ultimate Master Execution Prompt

**Vision:** Build a high-end, minimalist pet-tech ecosystem (Gemini-style UI) operating with a multi-agent smart system. The platform prioritizes scientific accuracy (NRC 2006), brand integrity (PetID), and human-approved automation.

---

## 1. Brand & UI Identity ✅
- **Visuals:** Light Mode, black text on white background, large readable fonts, minimal PETID logo.
- **Naming:** Strictly use PetID; replace all 'Vet Life' mentions with 'PetID Care'.
- **The Feed:** Vertical scroll (TikTok/Instagram style) for personalized content and NRC-based insights.

## 2. Data Intelligence (The OCR Hub) ✅
- **Deep Extraction:** Extract Pet/Owner data from uploads (Weight, Breed, Microchip, Address like 'רחוב צרת 12', Expiry Dates).
- **Sync Logic:** Scanned data proposes updates; User manual entry has 100% override authority.
- **Storage:** Files must be auto-tagged and archived in the pet's 'Documents' tab.

## 3. The Smart Agent Fleet (The Team) ✅
- **General Rule:** No "Robots". Use names only. All chat messages start with: `[Name] מ-PetID:`.
- **שרה (Sara)** — Service: Handles FAQs, general help, and user onboarding.
- **דני (Dani)** — Nutrition: Provides scientific food/health advice based on NRC 2006 standards.
- **רוני (Roni)** — Sales/Libra: Manages Libra Insurance leads and store offers post-scan.
- **אלונה (Alona)** — Content: Creates personalized articles and localized tips based on address (e.g., רחוב צרת 12).
- **גאי (Guy)** — CRM/Data: Confirms profile updates and document synchronization.
- **The Brain:** An orchestrator (Edge Function) that coordinates between all agents.

## 4. The Unified Chat Hub (App OS) ✅
- **Central Interface:** The chat is the primary way users interact. It handles uploads, purchases, and insurance leads via 'Action Cards'.
- **Proactive Engagement:** Agents initiate conversations based on events (e.g., 'Moving to a new address' or 'Weight gain detected').

## 5. Admin Control & Security ✅
- **Approval Queue:** Manual confirmation required for all external communications (WhatsApp/SMS), price changes, and Libra leads.
- **Kill Switch:** A global Admin button to freeze all autonomous agent functions instantly.
- **Activity Log:** Real-time trace of every decision: `[Timestamp] | [Agent Name] | [Action] | [Status]`.

## 6. Database & Integration ✅
- Schema with tables for `system_events`, `automation_bots`, `admin_approval_queue`, and `external_integrations`.
- Securely manage API Keys for Libra Insurance and messaging gateways.

## 7. Fleet Expansion (Agents 20 & 21) ✅
- **Agent 20 — Lex (Underwriting & Compliance):** Converts medical + nutritional data into insurance value. Cross-references Dr. NRC and Einstein. Generates eligibility reports. Enforces Privacy by Design (anonymization). Notifies Siggy for VIP benefits on excellent health profiles.
- **Agent 21 — Juno (Viral Growth & Community):** Analyzes social feed UGC for high engagement. Proposes content to Lumi based on real success stories. Identifies ambassador candidates. Routes budget approvals through Golan. Escalates trust crises to Menachem.
- **Inter-Agent Protocol:** All operate under Human-in-the-Loop — all financial, legal, and external marketing actions require admin approval.
- **Agent 22 — Maya (UX & Product Psychology):** Detects user friction (incomplete medical data → routes to Ori). Designs gamification strategies for Health Score. Coordinates visual feedback with Ofek. Optimizes micro-copy for empathy and action. Reports UX bugs to Ido.
