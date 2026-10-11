# LIFEOS — Offline-First Personal Life Operating System
> **Hackathon Theme:** *The Unreliable Data Backup Assumption*  
> **Brand:** LIFEOS | **AI Intelligence:** Cyris (Local-First Engine)  
> **Architecture:** Zero-Cloud-Dependency, Local-First IndexedDB Persistence, Service Worker PWA Caching, Optimistic Mutation Queue, Deterministic Conflict Resolution.

---

## 1. Executive Summary & Product Vision

Modern web productivity platforms (Notion, Todoist, Linear) rely on the brittle assumption of continuous, low-latency cloud connectivity. When network partitions or intermittent connections occur, user interactions often freeze, edits are dropped, or silent data overwrite hazards emerge.

**LIFEOS** solves *The Unreliable Data Backup Assumption* by turning traditional cloud architecture inside out:
1. **Local-First Writes:** All mutations (tasks, notes, study plans, user profiles) commit immediately to a browser-resident **IndexedDB database (Dexie)**.
2. **Deterministic Mutation Queue:** Every create, edit, or delete is appended to an append-only, durable sync queue with a unique idempotent operation UUID and monotonic base version.
3. **Application Shell Resilience:** PWA Service Worker caching serves the entire application shell and assets offline without making network requests.
4. **Idempotent Replay & Version Conflict Resolution:** Upon network restoration, queued mutations are replayed in chronological order. Concurrent modifications trigger side-by-side version comparison modals instead of blind last-write-wins (LWW) data loss.
5. **Cyris AI Assistant:** A local rule-based intelligence engine that operates directly on cached IndexedDB data with zero telemetry leakage, transparently labeled for offline operation.

---

## 2. Technology Stack

- **Framework:** React 18, Vite, TypeScript
- **Styling & UI:** Tailwind CSS, Lucide Icons, Custom design system (Brand `#00897B`, Navy `#0F172A`, Accent `#22C55E`, Light Surface `#F8FAFC`)
- **Local Storage:** IndexedDB powered by Dexie & `dexie-react-hooks`
- **Offline Shell & PWA:** `vite-plugin-pwa` with Workbox caching strategy (`StaleWhileRevalidate`)
- **Testing:** Vitest 3, React Testing Library, `fake-indexeddb`

---

## 3. Project Structure

```text
LIFEOS-Hackathon/
├── public/
│   ├── favicon.svg               # Brand icon
│   ├── pwa-192x192.png           # PWA icon (192px)
│   └── pwa-512x512.png           # PWA icon (512px)
├── src/
│   ├── assistant/
│   │   └── cyris.ts              # Local offline intelligence rule engine
│   ├── components/
│   │   ├── ConflictModal.tsx     # Side-by-side 3-way version conflict resolver
│   │   ├── Dashboard.tsx         # Daily overview, KPI cards, schedule & Cyris widget
│   │   ├── Header.tsx            # Connectivity pill, pending queue counter, navigation
│   │   ├── NotesAndStudyPlanner.tsx # Markdown notes & exam study roadmap checklists
│   │   ├── OfflineDemoPanel.tsx  # Dedicated 14-step offline simulation & verification lab
│   │   ├── OnboardingModal.tsx   # User profile setup & local persistence
│   │   └── TaskManager.tsx       # Local-first task CRUD with priority & category filters
│   ├── context/
│   │   └── LifeOSContext.tsx     # Reactive state management with useLiveQuery
│   ├── db/
│   │   └── index.ts              # Dexie schema, non-destructive sample seeding & reset
│   ├── sync/
│   │   ├── simulatedServer.ts    # In-memory/localStorage mock cloud with idempotency
│   │   └── syncManager.ts        # Queue orchestration, network listeners, sync lifecycle
│   ├── test/
│   │   ├── conflict-resolution.test.ts # Conflict detection & resolution tests
│   │   ├── cyris-assistant.test.ts     # Offline AI rule inference tests
│   │   ├── indexeddb-tasks.test.ts     # IndexedDB CRUD & notes persistence tests
│   │   ├── setup.ts                    # Vitest test setup with fake-indexeddb
│   │   ├── sync-queue.test.ts          # Queue persistence, reload survival & replay tests
│   │   └── ui-states.test.tsx          # Network pill & banner rendering tests
│   ├── types/
│   │   └── index.ts              # Domain types, operations, conflicts, schemas
│   ├── App.tsx                   # Main layout coordinator & modal triggers
│   ├── index.css                 # Tailwind directives & typography
│   └── main.tsx                  # PWA service worker registration & entrypoint
├── index.html                    # Root HTML document
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts                # Vite & PWA Workbox runtime caching configuration
└── vitest.config.ts              # Vitest test runner configuration
```

---

## 4. Key Architectural Mechanisms

### A. Local Caching & Startup
- The application registers a Service Worker via `vite-plugin-pwa`.
- All CSS, JavaScript bundles, HTML documents, and static images are cached locally with a `StaleWhileRevalidate` strategy.
- Upon booting offline (or refreshing without internet), the service worker intercepts requests and serves cached assets instantly.
- IndexedDB initial data seeding is guarded with non-destructive count checks: **existing user data is never overwritten with sample data**.

### B. Durable Sync Queue & Local-First Writes
Whenever a user creates, edits, or deletes a task, note, or study milestone:
1. The mutation is saved **directly into IndexedDB first** for instant UI reactivity.
2. A `SyncOperation` record is written to `db.syncQueue`:
   ```ts
   interface SyncOperation {
     id: string;          // Cryptographically secure idempotent UUID
     entityId: string;    // Target ID (e.g. task-1)
     entityType: string;  // 'task' | 'note' | 'study_plan' | 'profile'
     opType: string;      // 'CREATE' | 'UPDATE' | 'DELETE'
     payload: any;        // Mutation body
     timestamp: number;   // Creation epoch timestamp
     baseVersion: number; // Entity version when mutation began
     status: 'pending' | 'processing' | 'synced' | 'failed' | 'conflict';
   }
   ```
3. Because the queue lives in IndexedDB, **all pending mutations survive browser refreshes, hard reloads, and computer restarts**.

### C. Reconnection & Idempotent Processing
- `SyncManager` listens to both browser `online`/`offline` network events and simulated disconnect controls.
- When network returns, `processSyncQueue()` reads pending operations in chronological order (`timestamp` ascending).
- Mutations are sent to the simulated cloud server with their idempotent `operationId`.
- The server tracks `processedOpIds: Set<string>`. If an operation is replayed (due to network retries), the server returns `duplicate_ignored` without double-applying mutations.
- **Strict safety rule:** An operation is *never* removed from `syncQueue` until the server acknowledges successful receipt.

### D. Deterministic Conflict Resolution (No Naive LWW)
- Wall-clock timestamps suffer from clock drift, NTP skew, and timezone variations. LIFEOS uses **monotonic entity versioning**:
  - Each entity has a integer `version: number`.
  - When an entity is updated on the server, its version increments ($v_{server} = v_{server} + 1$).
  - When the client attempts to sync an edit whose `baseVersion < currentServerVersion`, the server flags a **Concurrent Modification Conflict**.
- The client pauses the specific operation, keeps it in `syncQueue` marked as `'conflict'`, and creates a `SyncConflict` record.
- The user is presented with the **Conflict Resolution Modal**, providing side-by-side comparison:
  - **Option 1 ("Keep My Version"):** Client forces local version to overwrite remote version.
  - **Option 2 ("Accept Cloud Version"):** Client adopts the remote cloud payload and discards local offline changes.

### E. Cyris AI Assistant
- Cyris is engineered to operate 100% locally when offline using deterministic rule parsing against active IndexedDB records.
- Questions like *"What should I work on today?"*, *"What tasks are pending?"*, and *"Help me plan my study session."* dynamically filter tasks due today, urgent priorities, and active study milestones directly from Dexie.
- An explicit badge clarifies: `Offline Rule Mode: Running 100% locally via IndexedDB. Zero cloud telemetry.`

---

## 5. Quick Start Instructions

### Prerequisites
- Node.js 18+ (tested on Node v24.14.1)
- npm 9+ (tested on npm 11.11.0)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open **`http://127.0.0.1:5173/`** in your browser.

### 3. Run Automated Tests
```bash
npm test
```
All 15 automated test suites run through Vitest in jsdom and `fake-indexeddb`.

### 4. Build for Production
```bash
npm run build
```
Generates production PWA assets, bundles, and service worker under `dist/`.

---

## 6. 14-Step Live Hackathon Demonstration Script

To demonstrate the full offline-first resilience workflow:

1. **Launch LIFEOS:** Open `http://127.0.0.1:5173/`. Notice the initial sample tasks, notes, and study plans loaded into the dashboard.
2. **Confirm Online State:** Look at the top header badge: green pulsing dot, labelled `Online`, and `Pending: 0`.
3. **Simulate Offline:** Click the **Offline Lab** tab and click the large button **"Simulate Offline (Sever)"**.
4. **Persistent Offline Indicator:** The header badge immediately turns amber with `Simulated Offline`. An offline notice banner appears across the top.
5. **Page Reload Test:** Press `F5` / `Ctrl+R` to refresh the browser. The page reloads seamlessly from the service worker cache and IndexedDB without failing!
6. **Mutate Data Offline:**
   - Go to **Tasks**, click **"New Task"**, enter *"Draft Resilience Whitepaper"*, priority `Urgent`, and save.
   - Click the checkmark on another task to complete it.
   - Go to **Notes**, create a new note *"Offline CRDT Insights"*.
7. **Inspect Pending Queue:**
   - Look at the header badge: notice `Pending: 3`.
   - Go to **Offline Lab**: scroll down to the **IndexedDB Sync Mutation Queue** inspector. You can inspect all 3 queued operations with their UUIDs, payloads, and `baseVersion`.
8. **Second Reload Test:** Refresh the page again (`F5`). All offline edits, completed statuses, and the pending count of 3 remain completely intact!
9. **Inject Cloud Conflict (Demonstration):** In the **Offline Lab**, click **"Inject Cloud Conflict"**. This simulates a teammate on the cloud modifying `task-1` to version 2 while you were disconnected.
10. **Local Edit on Conflicting Task:** Go to **Tasks**, click Edit on `task-1` ("Prepare Distributed Consensus Slides"), change its title to *"My Local Consensus Edits"*, and save.
11. **Reconnect & Sync:** Return to **Offline Lab** and click **"Simulate Online (Restore)"** followed by **"Reconnect & Sync"**.
12. **Server Replay & Acknowledgment:** Operations replay against the simulated server. Non-conflicting operations are acknowledged and removed from the queue.
13. **Interactive Conflict Resolution Modal:** The conflict detector detects that `task-1` was concurrently modified! The **Conflict Resolution Modal** opens automatically:
    - Side-by-side comparison: Your local version (Base v1) vs Remote cloud version (Server v2).
    - Click **"Keep My Version"** or **"Accept Cloud Version"**.
14. **Final Synchronized State:** Confirm pending queue is now `0`, conflicts is `0`, and data consistency is maintained!

---

## 7. Known Limitations & Production Enhancements

- **Simulated Server Backend:** The demo uses an in-memory & `localStorage`-backed simulated server with strict idempotency and version checking. For production enterprise deployments, connect `SyncManager` to a real HTTP/WebSocket backend endpoint with PostgreSQL / DynamoDB.
- **Field-Level 3-Way Merge:** The current conflict resolution presents entity-level choices ("Keep My Version" vs "Accept Cloud Version"). Future iterations can introduce field-level AST merging or State-based CRDTs (LWW-Element-Set) for collaborative rich text.
- **Browser Storage Quota:** IndexedDB storage is subject to browser eviction policies if device disk space drops below 10%. Users can safely export or reset data via the provided control panel.
