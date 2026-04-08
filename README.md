# AssetSentinel

An intelligent electrical asset monitoring and predictive analytics platform that uses machine learning to detect anomalies, predict degradation, and optimize operational efficiency across electrical infrastructure networks.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Folder Structure](#folder-structure)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [License](#license)

## 🎯 Overview

AssetSentinel is a comprehensive solution for monitoring electrical assets (transformers, distribution systems, loads, power sources) in complex industrial networks. It combines real-time telemetry processing with ML-based decision intelligence to provide early warning systems and predictive analytics.

**Key Capabilities:**
- Real-time asset monitoring and telemetry collection
- Network topology management with cycle detection
- Anomaly detection using statistical learning
- Role-based access control (Admin/SuperAdmin)
- Audit logging for compliance
- Interactive dashboards with KPI visualization
- Predictive degradation analysis

## ✨ Features

### Core Features
- **Asset Management** - Create, update, and manage electrical assets with detailed specifications
- **Network Topology** - Build and visualize asset connection networks with upstream/downstream relationships
- **Real-time Telemetry** - Ingest electrical parameters (voltage, current, power, temperature)
- **Anomaly Detection** - Detect anomalies using decision intelligence (DI) with z-score standardization
- **State Classification** - Automatic classification into NORMAL, WARNING, or CRITICAL states
- **Temporal Consistency** - Apply windowed analysis for robust state determination
- **User Management** - Hierarchical role system (Admin/SuperAdmin) with JWT authentication
- **Audit Logging** - Track all user actions for compliance and security
- **Dashboard** - Interactive web UI with asset visualization, KPI grids, and degradation charts
- **Multi-page Navigation** - Dedicated pages for dashboard, network, assets, login, and admin functions

### Data Analysis Features
- **Baseline Computation** - Calculate statistical baselines for asset telemetry
- **DI Calculation** - Compute decision intelligence scores with z-score normalization
- **Degradation Tracking** - Monitor asset health trends over time
- **Feature Engineering** - Advanced feature extraction for ML models

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js + React)               │
│  Dashboard │ Assets │ Network │ Superadmin │ Login         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
┌──────────────────────────▼──────────────────────────────────┐
│              FastAPI Backend (Python)                       │
├──────────────────────────────────────────────────────────────┤
│ Routers:                                                     │
│  ├─ /api/assets      - Asset CRUD & retrieval              │
│  ├─ /api/connections - Network topology management         │
│  ├─ /api/network     - Network analysis                    │
│  ├─ /api/analysis    - Telemetry analysis & anomaly detect │
│  └─ /api/admin       - User management & administration    │
├──────────────────────────────────────────────────────────────┤
│ Services:                                                    │
│  ├─ network_service  - Topology analysis & computation     │
│  └─ ml_service       - ML/analytics operations             │
└──────────────────────┬───────────────────────────────────────┘
                       │ SQL
┌──────────────────────▼──────────────────────────────────────┐
│            PostgreSQL Database                              │
├──────────────────────────────────────────────────────────────┤
│ Tables:                                                      │
│  ├─ users            - User accounts & roles               │
│  ├─ assets           - Electrical assets & specifications  │
│  ├─ asset_connections- Network topology edges             │
│  ├─ telemetry        - Time-series sensor data            │
│  ├─ di_baselines     - Statistical baselines              │
│  └─ audit_logs       - Action audit trail                 │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         ML/Analytics Core (Python)                          │
├─────────────────────────────────────────────────────────────┤
│ ├─ decision.py       - State classification logic          │
│ ├─ degradation.py    - Health trend analysis              │
│ ├─ feature_eng.py    - Feature extraction & engineering   │
│ └─ visualization.py  - Chart & metric generation          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Sensors/IoT → Backend Ingestion → Telemetry Storage
              ↓
         Analysis Engine
         (Decision Intelligence)
              ↓
         State Classification
         (NORMAL/WARNING/CRITICAL)
              ↓
         Dashboard Visualization
         ↓
    User Alerts & Actions
         ↓
    Audit Logging
```

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI 0.109.2 (async Python web framework)
- **Server**: Uvicorn 0.27.1 (ASGI server)
- **ORM**: SQLAlchemy + Pydantic 2.6.1 (data validation)
- **Database**: PostgreSQL (psycopg2-binary driver)
- **Authentication**: python-jose + passlib + bcrypt (JWT-based)
- **Task Processing**: Pandas, NumPy, Torch

### Frontend
- **Framework**: Next.js 16.2.1 (React meta-framework)
- **UI Library**: React 19.2.4 + TypeScript 5
- **Visualization**: Recharts 3.8.0 (charts)
- **Animation**: Framer Motion 12.38.0
- **Icons**: Lucide React 0.577.0
- **Dev Tools**: ESLint 9, TypeScript compiler

### Infrastructure
- **Version Control**: Git
- **Runtime**: Node.js (frontend), Python 3.x (backend)
- **Process Manager**: Uvicorn/PM2 (production)

## 📦 Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 12+
- pip, npm

### Backend Setup

```bash
# 1. Navigate to API directory
cd api

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Create .env file (see Configuration section)
cp .env.example .env

# 5. Initialize database
python ../setup_db.py

# 6. Seed initial data
python ../seed_network_3576.py

# 7. Start backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# 1. Navigate to web directory
cd web

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Access at http://localhost:3000
```

### Running Both Services

```bash
# Terminal 1: Backend
cd api
source venv/bin/activate
uvicorn main:app --reload

# Terminal 2: Frontend
cd web
npm run dev
```

## 🚀 Usage

### Default Credentials

```
SuperAdmin Account:
  Email: admin@assetsentinel.com
  Password: admin@123

Demo Account:
  Email: demo@assetsentinel.com
  Username: demo_sentinel
```

### Accessing the Application

1. **Frontend Dashboard**: http://localhost:3000
2. **API Documentation**: http://localhost:8000/docs (Swagger UI)
3. **API ReDoc**: http://localhost:8000/redoc

### Common Workflows

#### Create a New Asset
```bash
POST /api/assets
{
  "id": "MTR-001",
  "name": "Main Transformer",
  "asset_type": "TRANSFORMER",
  "site": "Site-A",
  "building": "Building-1",
  "rated_voltage": 480,
  "rated_current": 100,
  "rated_power": 48000
}
```

#### Add Network Connection
```bash
POST /api/connections
{
  "parent_asset_id": "SRC-001",
  "child_asset_id": "MTR-001",
  "impedance": 0.05
}
```

#### Submit Telemetry Data
```bash
POST /api/telemetry
{
  "asset_id": "MTR-001",
  "rms_voltage": 478.5,
  "rms_current": 98.2,
  "real_power": 47500
}
```

#### Analyze Asset for Anomalies
```bash
POST /api/analysis/analyze-asset
{
  "asset_id": "MTR-001",
  "temp_increase": 5,
  "volt_increase": 0,
  "duty_increase": 10
}
```

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login              - User login
POST   /api/auth/register           - User registration (admin only)
GET    /api/auth/me                 - Get current user info
```

### Assets
```
GET    /api/assets                  - List assets
POST   /api/assets                  - Create asset
GET    /api/assets/{id}             - Get asset details
PUT    /api/assets/{id}             - Update asset
DELETE /api/assets/{id}             - Delete asset
```

### Network
```
POST   /api/connections             - Create connection
GET    /api/connections             - List connections
GET    /api/network/state           - Get network state analysis
GET    /api/network/hierarchy       - Get network hierarchy
POST   /api/network/compute-load    - Compute asset load
```

### Analysis
```
POST   /api/analysis/analyze-asset  - Analyze single asset
GET    /api/analysis/history        - Get analysis history
```

### Administration
```
GET    /api/admin/users             - List users (superadmin)
POST   /api/admin/users             - Create user
PUT    /api/admin/users/{id}        - Update user role
DELETE /api/admin/users/{id}        - Delete user
GET    /api/admin/audit-logs        - View audit logs
```

## 📁 Folder Structure

```
asset-sentinel/
├── api/                            # FastAPI backend
│   ├── main.py                    # Application entry point
│   ├── models.py                  # SQLAlchemy ORM models
│   ├── schemas.py                 # Pydantic request/response schemas
│   ├── database.py                # Database connection & setup
│   ├── auth.py                    # JWT authentication logic
│   ├── config.py                  # Configuration management
│   ├── seed.py                    # Database seeding functions
│   ├── requirements.txt            # Python dependencies
│   ├── routers/                   # API route handlers
│   │   ├── assets.py             # Asset CRUD endpoints
│   │   ├── network.py            # Network topology endpoints
│   │   ├── analysis.py           # Analysis endpoints
│   │   └── admin.py              # Administration endpoints
│   ├── services/                  # Business logic layer
│   │   ├── network_service.py    # Network computation functions
│   │   └── ml_service.py         # ML/analytics operations
│   └── tests/                     # Backend unit tests
│
├── web/                            # Next.js frontend
│   ├── src/
│   │   ├── app/                  # Next.js app router
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── page.tsx          # Dashboard page
│   │   │   ├── login/            # Login page
│   │   │   ├── network/          # Network visualization page
│   │   │   ├── assets/           # Assets management page
│   │   │   ├── superadmin/       # Admin panel
│   │   │   └── testing/          # Testing utilities
│   │   ├── components/           # Reusable React components
│   │   │   ├── KPIGrid.tsx      # KPI metric display
│   │   │   ├── DegradationChart.tsx # Trend visualization
│   │   │   └── BottomNavigation.tsx # Mobile nav
│   │   ├── hooks/                # Custom React hooks
│   │   │   └── useDeviceType.ts # Responsive design hook
│   │   └── lib/                  # Utilities & API client
│   │       └── api.ts            # API request functions
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── eslint.config.mjs
│
├── code/                           # Core analytics & ML
│   ├── core/
│   │   ├── decision.py           # State classification logic
│   │   ├── degradation.py        # Health trend analysis
│   │   ├── feature_engineering.py # Feature extraction
│   │   └── visualization.py       # Chart generation
│
├── model/                          # ML models directory
├── output/                         # Analysis output storage
├── setup_db.py                    # Database initialization script
├── seed_network_3576.py           # Generate test network
├── .env.example                    # Example environment variables
├── .gitignore                      # Git ignore rules
├── README.md                       # This file
├── CONTRIBUTING.md                # Contribution guidelines
├── LICENSE                         # MIT License
└── package.json                    # Root workspace config
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/asset_sentinel
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asset_sentinel
DB_USER=postgres
DB_PASSWORD=secure_password

# API Configuration
API_SECRET_KEY=your-super-secret-key-change-in-production
API_ALGORITHM=HS256
API_TOKEN_EXPIRATION_MINUTES=1440

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Application Settings
DEBUG=false
LOG_LEVEL=info
```

**Security Notes:**
- Never commit `.env` to version control
- Use strong, unique secret keys in production
- Rotate tokens regularly
- Use environment-specific credentials

## 🗄️ Database Schema

### Key Tables

**users**
- Stores user accounts with authentication
- Supports role-based access control (admin/superadmin)
- JWT token management

**assets**
- Electrical assets (SOURCE, TRANSFORMER, DISTRIBUTION, LOAD)
- Electrical specifications (voltage, current, power, frequency)
- Operational limits and safety thresholds
- Baseline telemetry for anomaly detection

**asset_connections**
- Represents network topology edges
- Connects parent (upstream) to child (downstream) assets
- Stores impedance for load calculation

**telemetry**
- Time-series sensor data (voltage, current, power, temperature)
- Indexed by asset_id and timestamp for fast query
- Supports both real-time and historical analysis

**di_baselines**
- Statistical baselines (μ, σ) for decision intelligence
- Computed during asset initialization

**audit_logs**
- Tracks all user actions for compliance
- Records action type, timestamp, user, and details

## 🛠️ Development

### Code Quality
```bash
# Lint frontend code
cd web && npm run lint

# Format code (if available)
npm run format
```

### Backend Development
```bash
# Run with auto-reload
uvicorn api.main:app --reload --port 8000

# Interactive API docs
# Visit http://localhost:8000/docs
```

### Database Migrations
```bash
# Seed test data
python seed_network_3576.py

# Reset database
python clear_and_reseed.py

# Debug database
python debug_db_pg.py
```

## 🧪 Testing

### Backend Tests
```bash
# Navigate to test directory
cd api/tests

# Run tests
pytest ../tests/

# Run with coverage
pytest --cov=api ../tests/
```

### Frontend Tests
```bash
cd web
npm test
```

### Integration Testing
- Use the `/testing` page in the UI for manual testing
- Test user workflows: login → create asset → add connection → analyze

## 🚢 Deployment

### Production Backend Deployment

```bash
# Build & start with Uvicorn + reverse proxy
gunicorn api.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker

# Or with environment
PM2_HOME=/var/lib/pm2 pm2 start api.main:app --name assetsentinel --instances 4
```

### Production Frontend Deployment

```bash
cd web

# Build optimized bundle
npm run build

# Start production server
npm start

# Or use PM2
pm2 start npm --name assentinel-web -- start
```

### Docker Support (Optional)
- Backend: Base on `python:3.11-slim` with Uvicorn
- Frontend: Base on `node:18-alpine` with Next.js
- Database: Official PostgreSQL image

## 🔮 Future Improvements

### Near-term (v2.1)
- [ ] Real-time WebSocket support for live telemetry
- [ ] ML model training pipeline for custom anomaly detection
- [ ] Advanced filtering & search on assets & history
- [ ] Export functionality (CSV, PDF reports)
- [ ] Scheduled health check reports

### Medium-term (v2.5)
- [ ] Multi-tenancy support for enterprise deployments
- [ ] IoT gateway integration (native support for MQTT/modbus)
- [ ] Predictive maintenance scheduling
- [ ] REST API rate limiting & quota management
- [ ] Custom dashboard widgets
- [ ] Dark mode UI theme

### Long-term (v3.0)
- [ ] GraphQL API alongside REST
- [ ] Distributed ML model inference
- [ ] Mobile app (iOS/Android)
- [ ] Time-series database optimization (InfluxDB/TimescaleDB)
- [ ] Advanced visualization (3D network topology)
- [ ] Integration marketplace (webhook/Zapier support)

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for full details.

---

## 📞 Support

For issues, questions, or contributions, please refer to [CONTRIBUTING.md](CONTRIBUTING.md).

**Last Updated**: April 2026  
**Version**: 2.0.0
