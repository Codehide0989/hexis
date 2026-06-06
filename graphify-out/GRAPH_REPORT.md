# Graph Report - .  (2026-06-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 338 nodes · 499 edges · 37 communities (29 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9a22a968`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 28|Community 28]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 36 edges
2. `supabase` - 29 edges
3. `compilerOptions` - 20 edges
4. `usePlan()` - 17 edges
5. `compilerOptions` - 16 edges
6. `Reminder` - 8 edges
7. `scripts` - 7 edges
8. `AdminUser` - 7 edges
9. `DashboardLayout()` - 7 edges
10. `UpgradeGate()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `cn()` --calls--> `clsx`  [INFERRED]
  src/lib/utils.ts → package.json
- `hashPassword()` --calls--> `md5`  [INFERRED]
  src/lib/md5-auth.ts → package.json
- `CalendarModule()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/modules/Calendar.tsx → src/hooks/useAuth.ts
- `Kanban()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/modules/Kanban.tsx → src/hooks/useAuth.ts
- `RemindersModule()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/modules/Reminders.tsx → src/hooks/useAuth.ts

## Communities (37 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (30): AdminLayout(), AdminRoute(), AdminRouteProps, AdminSidebarProps, DashboardLayout(), adminLogin(), adminLogout(), AdminUser (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (31): PlanContextType, PlanFeatures, PlanName, PlanProvider(), usePlan(), UserPlan, useAuth(), PrivateRoute() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (27): devDependencies, autoprefixer, cors, dotenv, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, ignoreDeprecations, jsx, lib, module (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (22): dependencies, bcryptjs, clsx, date-fns, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, html2canvas (+14 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, lint, preview, push-db (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (7): CalendarEvent, CalendarModule(), locales, localizer, DatePicker(), DatePickerProps, TimePickerProps

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 10 - "Community 10"
Cohesion: 0.28
Nodes (5): ActivityItem, DashboardStats, defaultStats, Overview(), Settings()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (5): Priority, PRIORITY_COLORS, Status, Task, Tasks()

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 13 - "Community 13"
Cohesion: 0.40
Nodes (5): InvoiceEmailData, sendInvoiceEmail(), sendReminderEmail(), Reminder, RemindersModule()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (3): Kanban(), KanbanCard, PRIORITY_COLORS

### Community 15 - "Community 15"
Cohesion: 0.50
Nodes (3): app, __dirname, __filename

### Community 16 - "Community 16"
Cohesion: 0.50
Nodes (3): openRazorpayCheckout(), PLAN_PRICES, RazorpayOptions

## Knowledge Gaps
- **173 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+168 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 1` to `Community 0`, `Community 8`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 17`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `supabase` connect `Community 0` to `Community 1`, `Community 8`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 17`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `DashboardLayout()` connect `Community 0` to `Community 1`, `Community 12`, `Community 17`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useAuth()` (e.g. with `LoginForm()` and `SignupForm()`) actually correct?**
  _`useAuth()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.059395801331285206 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09855072463768116 - nodes in this community are weakly interconnected._