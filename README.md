# INKVERSE — Community Blogging & Creator Rewards Platform

> **Live Production Domain:** `https://blog.shreeharsha.online`  
> **Architecture:** Cloudflare Workers, Cloudflare D1 (Distributed SQLite), Cloudflare R2, React 19, TypeScript, Vite, Tailwind CSS, Tiptap.

---

## 1. Project Overview

**INKVERSE** is a modern, community-driven editorial publishing and creator rewards platform. Unlike personal blogs, INKVERSE empowers any writer to join via OAuth, publish stories, build an audience, participate in threaded conversations, unlock achievements, and earn reputation points based on genuine content quality and verified readers.

### Key Highlights:
- **Premium Editorial Aesthetic:** Newsreader serif typography, Plus Jakarta Sans, dark mode default with purple/indigo accents, distraction-free reading, and micro-interactions.
- **Server-Side Gamification Engine:** Points ledger (`points_transactions`), 7 creator tiers (Beginner to Legend), milestone rewards, and automated badge awards.
- **Confidential Dislike Protection:** Public likes are celebrated; dislikes are strictly private to the author with author-controlled dashboard visibility and zero public API leakage.
- **Robust Anti-Abuse System:** Bot and crawler exclusion, SHA-256 privacy-preserving daily visitor deduplication, self-engagement prevention, and administrative point reversals with audit trails.
- **Cloudflare-Native Architecture:** Ultra-low latency edge execution running on Cloudflare Workers, Cloudflare D1, and R2 media storage.

---

## 2. Platform Architecture

```
                  ┌──────────────────────────────────────────────────┐
                  │          blog.shreeharsha.online                 │
                  └────────────────────────┬─────────────────────────┘
                                           │
                                           ▼
                  ┌──────────────────────────────────────────────────┐
                  │            Cloudflare Edge Workers               │
                  │  (Hono Router · Auth · Gamification · Anti-Abuse)│
                  └───┬────────────────────┬─────────────────────┬───┘
                      │                    │                     │
                      ▼                    ▼                     ▼
          ┌──────────────────────┐ ┌───────────────┐ ┌──────────────────────┐
          │    Cloudflare D1     │ │ Cloudflare R2 │ │  Vite / React Client │
          │  (Relational SQLite) │ │(Media & Imgs) │ │ (Tailwind · Tiptap)  │
          └──────────────────────┘ └───────────────┘ └──────────────────────┘
```

### Tech Stack:
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Tiptap Rich-Text Editor, DOMPurify.
- **Backend:** Cloudflare Workers running Hono with RESTful routing, CORS, and Zod schema validation.
- **Database:** Cloudflare D1 with foreign key integrity, indexes, and immutable ledger transactions.
- **Media Storage:** Cloudflare R2 bucket (`MEDIA_BUCKET`) with base64 dev fallback.
- **Testing:** Vitest test suite with an in-memory SQLite D1 simulation for 100% deterministic test passes.

---

## 3. Database Schema

The normalized relational schema includes 21 tables:
1. `users`: Core profile data, role (`user`, `moderator`, `admin`), points, level, and `show_dislike_stats` toggle.
2. `oauth_accounts`: Google and GitHub provider mappings.
3. `sessions`: Cryptographic session tokens with 30-day TTL.
4. `blogs`: Articles with status (`draft`, `published`, `scheduled`, `unlisted`), reading time, word count, views, likes, dislikes.
5. `blog_revisions`: Version history and rollback records.
6. `categories`: 10 core editorial categories (Technology, Programming, AI, Science, Startups, Business, Lifestyle, etc.).
7. `tags` & `blog_tags`: Normalized taxonomy tags.
8. `reactions`: Unique constraint `(user_id, blog_id)` ensuring 1 active reaction per user.
9. `blog_views`: Daily hash deduplication preventing refresh manipulation.
10. `points_transactions`: Immutable financial-grade rewards ledger.
11. `achievements` & `user_achievements`: Milestone badges catalog.
12. `followers`: Social graph.
13. `comments` & `comment_reactions`: Threaded discussions with author moderation.
14. `bookmarks`: User reading lists.
15. `notifications`: In-app notification center.
16. `reports`: Community content moderation.
17. `admin_audit_logs`: Administrative actions audit trail.
18. `platform_settings`: Dynamic point reward rules and moderation mode.

---

## 4. Gamification & Points Engine

Points are awarded exclusively through backend transactions:

| Activity | Reward | Trigger Condition |
| :--- | :---: | :--- |
| **Publish Story** | `+20 pts` | Upon first publication of a story |
| **Verified Readers** | `+5 pts` | For every 100 deduplicated unique views |
| **Genuine Likes** | `+5 pts` | For every 10 genuine likes from unique users |
| **Editor's Choice** | `+50 pts` | Handpicked by curators or admins |
| **Achievement Badge**| `+20–50 pts` | Reaching milestones (1K views, 100 likes, etc.) |
| **7-Day Streak** | `+25 pts` | Active 7-day writing/publishing streak |

### Creator Level Tiers:
- **Level 1: Beginner** (0 – 49 pts)
- **Level 2: Contributor** (50 – 149 pts)
- **Level 3: Writer** (150 – 349 pts)
- **Level 4: Skilled Writer** (350 – 699 pts)
- **Level 5: Expert** (700 – 1,299 pts)
- **Level 6: Master** (1,300 – 2,499 pts)
- **Level 7: Legend** (2,500+ pts)

---

## 5. Security & Private Dislike Guarantee

1. **Dislike Confidentiality:** Public APIs (`/api/blogs`, `/api/blogs/:slug`) never expose dislike metrics to non-authors. Only the author can see private dislike analytics in their dashboard when `show_dislike_stats` is enabled.
2. **XSS Defense:** Content from the Tiptap editor is sanitized with DOMPurify on display. Script injection and arbitrary iframe execution are neutralized.
3. **View Deduplication:** Known bots and automated crawlers are filtered out via user-agent analysis. Human views are deduplicated per 24 hours using SHA-256 salted hashes.
4. **Self-Engagement Prevention:** Authors reacting to or refreshing their own blogs does not generate points.
5. **Fraud Reversals:** Administrators can reverse fraudulent point allocations via `/api/admin/points/reverse`, creating an audit log entry and notifying the author.

---

## 6. Local Development Setup

### Prerequisites
- Node.js v20+ / v26+
- npm v10+

### Installation & Migrations
```bash
# 1. Install dependencies
npm install

# 2. Run unit and integration tests (14/14 tests)
npm test

# 3. Apply D1 database migrations locally
npm run d1:migrate:local

# 4. Build frontend distribution
npm run build
```

### Running Locally
```bash
# Terminal 1: Run Worker backend (emulating Cloudflare D1 & R2 locally on port 8787)
npx wrangler dev

# Terminal 2: Run Vite frontend dev server (port 5173, proxying /api to 8787)
npm run dev
```

Visit `http://localhost:5173` to explore INKVERSE!

---

## 7. Instant Demo Accounts

For immediate local or review testing without configuring Google or GitHub secrets:

- **Admin Profile:** `shreeharsha` (Role: `admin`, 3,850 pts, Level 7 Legend)
- **Staff Author:** `elena_writes` (Role: `user`, 1,450 pts, Level 6 Master)
- **Community Reader:** `alex_reader` (Role: `user`, 180 pts, Level 3 Writer)

Click **Sign In** → **Instant Demo Access** in the UI to switch between roles instantly.

---

## 8. Production Deployment to `blog.shreeharsha.online`

The application runs independently on the `blog.shreeharsha.online` subdomain without impacting the apex portfolio website.

### Step 1: Create Cloudflare D1 Database & R2 Bucket
```bash
# Create D1 database
npx wrangler d1 create inkverse-db

# Create R2 bucket for uploads
npx wrangler r2 bucket create inkverse-media
```
Copy the generated `database_id` into `wrangler.toml`.

### Step 2: Apply Remote Migrations
```bash
# Apply schema and initial categories & achievements to production D1
npm run d1:migrate:prod
```

### Step 3: Configure Cloudflare Secrets
```bash
# Google OAuth
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET

# GitHub OAuth
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

### Step 4: Build and Deploy
```bash
# Build frontend assets into dist/
npm run build

# Deploy Cloudflare Worker with embedded static assets
npm run worker:deploy
```

### Custom Subdomain Routing
In the Cloudflare Dashboard under **Workers & Pages** → `inkverse-blog` → **Settings** → **Domains & Routes**:
- Add Custom Domain: `blog.shreeharsha.online`
- Cloudflare will provision the SSL certificate and route requests directly to this Worker.

---

## 9. Verification & Automated Test Suite

Run the Vitest test suite anytime:
```bash
npm test
```

Verified test suites cover:
- **Authentication & Onboarding:** Session tokens, profile editing, username uniqueness, demo authentication.
- **Publishing & Revisions:** Story creation, autosaved drafts, revision history, author ownership checks.
- **Reaction Confidentiality:** Likes vs. Dislikes, 1 reaction per user, toggle off, and verification that dislike counts are never leaked to public APIs.
- **Anti-Abuse Engine:** Bot blocking, daily SHA-256 deduplication of views, view milestones.
- **Staff Moderation & Gamification:** RBAC permissions, Editor's Pick selection, points ledger integrity, fraudulent points reversal with audit logs.
- **Community Features:** Threaded comments, author moderation, bookmarking, and follow notifications.
- **Security & Uploads:** File MIME type verification and 5MB size limits.
