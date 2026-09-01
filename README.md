# PayPawa Web Admin Console

The modern, real-time web administration portal for the PayPawa Smart Electricity Platform.

## 🚀 Features

- **Dashboard & KPIs**: Real-time platform metrics, daily volume, active users, and system status.
- **Transactions & Orders**: Live transaction stream, filter by status, token delivery inspections, retry failed purchases.
- **Operations & Incidents**: Service health monitoring (DISCO gateways, payment processors, Supabase DB), maintenance mode toggles.
- **Financial Reconciliation & Settlement**: Ledger reconciliation, DISCO balance tracking, automated settlements, anomaly alerts.
- **Customer Support & Case Management**: Unified support inbox, ticket SLAs, customer meter and payment histories.
- **Role-Based Access Control (RBAC) & Governance**: Multi-tier permissions (Super Admin, Ops Lead, Support, Auditor), MFA verification, IP restriction policies.
- **Audit Logs**: Immutable timeline of sensitive administrative actions and configuration changes.
- **Integrations & AI Settings**: Gateway API keys, webhook endpoints, consumption model thresholds, automated dispatch controls.

## 🛠️ Tech Stack

- **Framework**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS / Modern UI Design System
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend & Database**: [Supabase](https://supabase.com/)

## 📦 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/musaabduljnr/PayPawa-web-admin.git
cd PayPawa-web-admin

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```
