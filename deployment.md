# INKVERSE — Production Deployment Guide
**Target Domain:** `https://blog.shreeharsha.online`

This guide walks you step-by-step through deploying the INKVERSE platform to **Cloudflare Workers** with **Cloudflare D1** (Serverless SQLite), **Cloudflare R2** (Image & Media Storage), and **Cloudflare KV** (Session & Caching).

---

## 🏗️ Architecture Summary

```
                      https://blog.shreeharsha.online
                                    │
                                    ▼
                     Cloudflare Edge Global Network
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
   Static SPA Assets (/dist)               Cloudflare Worker (Hono)
   - React 19, Tailwind CSS                - REST API & Gamification
   - Newsreader Serif Typography           - OAuth Callback Handlers
   - Infinite Stream Feed                  - Private Dislike Analytics
               │                                         │
               │                    ┌────────────────────┼────────────────────┐
               │                    ▼                    ▼                    ▼
               │           Cloudflare D1        Cloudflare R2        Cloudflare KV
               │           (inkverse-db)        (inkverse-media)     (inkverse-kv-prod)
```

- **Frontend**: React 19 Single Page App bundled with Vite into `./dist`. Served directly from Cloudflare's global edge cache with SPA fallback routing.
- **Backend API**: Cloudflare Worker running Hono in `worker/index.ts` with Node.js compatibility (`nodejs_compat`).
- **Database**: Cloudflare D1 distributed SQLite database with automated migration schema.
- **Media**: Cloudflare R2 bucket for cover photos and blog images with client-side drag-and-drop uploads.
- **Authentication**: Google OAuth 2.0 and GitHub OAuth with session tokens stored in D1/KV.

---

## 📋 Prerequisites

Before deploying, ensure you have:
1. **Node.js**: v18.0.0 or higher (`node -v`)
2. **Cloudflare Account**: [Sign up for free](https://dash.cloudflare.com/sign-up)
3. **Domain Configured**: `shreeharsha.online` added to your Cloudflare account with active nameservers.
4. **Wrangler CLI**: Installed locally (included in `devDependencies`).

---

## 🚀 Step-by-Step Deployment

### Step 1: Login to Cloudflare Wrangler CLI

Authenticate Wrangler with your Cloudflare account:

```bash
npx wrangler login
```

Verify your authentication and view your Account ID:

```bash
npx wrangler whoami
```

---

### Step 2: Create Cloudflare Cloud Resources

Run the following three commands in your terminal to provision the production database, media bucket, and KV namespace:

#### 1. Create the D1 Database
```bash
npx wrangler d1 create inkverse-db
```
*Output will display:*
```text
[[d1_databases]]
binding = "DB"
database_name = "inkverse-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
> **Note:** Copy the `database_id` generated above and update it in [`wrangler.toml`](file:///home/shnl/Projects/Blog-website/wrangler.toml#L13):
> ```toml
> database_id = "YOUR_ACTUAL_D1_DATABASE_ID"
> ```

#### 2. Create the R2 Media Bucket
```bash
npx wrangler r2 bucket create inkverse-media
```

#### 3. Create the KV Cache Namespace
```bash
npx wrangler kv namespace create inkverse-kv-prod
```
> **Note:** Copy the `id` generated and update it in [`wrangler.toml`](file:///home/shnl/Projects/Blog-website/wrangler.toml#L22):
> ```toml
> id = "YOUR_ACTUAL_KV_NAMESPACE_ID"
> ```

---

### Step 3: Run Database Migrations on Remote D1

Apply the database schema (users, blogs, reactions, comments, gamification points ledger, audit trail) to your live Cloudflare D1 database:

```bash
npm run d1:migrate:prod
```

*(Optional)* Seed sample demo blogs, top creators, and categories to populate the live feed immediately:

```bash
npx wrangler d1 execute inkverse-db --remote --file=./migrations/0002_seed_demo_data.sql
```

---

### Step 4: Configure Production Secrets

Sensitive keys should **never** be committed to Git. Cloudflare Workers encrypts them via `wrangler secret put`. Run each command and paste your secret when prompted:

#### 1. Session JWT Secret
Generate a cryptographically secure 32+ byte string:
```bash
openssl rand -base64 32
```
Store it in Cloudflare:
```bash
npx wrangler secret put JWT_SECRET
```

#### 2. Google OAuth Credentials
Obtain from [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

#### 3. GitHub OAuth Credentials
Obtain from [GitHub Developer Settings](https://github.com/settings/developers) (New OAuth App):
```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

#### 4. Cloudflare Turnstile Bot Protection (Optional)
```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

---

### Step 5: Configure OAuth Redirect URIs

In your provider dashboards, register the exact production callback URLs:

#### Google Cloud Console (`APIs & Services` > `Credentials` > OAuth 2.0 Client ID)
- **Authorized JavaScript origins:**
  - `https://blog.shreeharsha.online`
  - `http://localhost:5173` (for local dev)
- **Authorized redirect URIs:**
  - `https://blog.shreeharsha.online/api/auth/oauth/google/callback`
  - `http://localhost:5173/api/auth/oauth/google/callback`

#### GitHub Developer Settings (`Settings` > `Developer settings` > `OAuth Apps`)
- **Homepage URL:** `https://blog.shreeharsha.online`
- **Authorization callback URL:** `https://blog.shreeharsha.online/api/auth/oauth/github/callback`

---

### Step 6: Build & Deploy

Run the deployment command:

```bash
npm run deploy
```

This script will:
1. Compile TypeScript and build the production Vite bundle to `./dist` (`tsc && vite build`).
2. Package the Cloudflare Worker with static SPA assets.
3. Deploy the application to Cloudflare's global edge network.

---

### Step 7: Connect Custom Domain (`blog.shreeharsha.online`)

To route `blog.shreeharsha.online` to your deployed Worker:

1. Open your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** > Click **`inkverse-blog`**.
3. Go to **Settings** > **Domains & Routes** > Click **Add** > **Custom Domain**.
4. Enter:
   ```text
   blog.shreeharsha.online
   ```
5. Click **Add Custom Domain**. Cloudflare will automatically provision a free universal SSL/TLS certificate and configure DNS routing.

Within 1–2 minutes, your website will be live at:
👉 **https://blog.shreeharsha.online**

---

## 🔍 Post-Deployment Verification Checklist

Once deployed, verify the following core workflows:

- [ ] **Homepage Feed**: Navigate to `https://blog.shreeharsha.online` and confirm the clean editorial feed loads with latest stories and smooth infinite scroll.
- [ ] **Authentication**: Click **Sign In** and verify Google and GitHub OAuth logins work.
- [ ] **First-Time Onboarding**: Verify first-time users can pick their `@username` handle, bio, and preferred topics.
- [ ] **Publish Story**: Click **Write** and publish an article with markdown, cover image, and tags.
- [ ] **Engagement**: Verify 1-click Likes, Bookmarks, and Comments update in real time.
- [ ] **Dislike Privacy**: Confirm dislike counts are **never** displayed publicly and only visible to the author in `/dashboard`.
- [ ] **Author Dashboard**: Check that view counts, likes, followers, and gamification points ledger are tracking properly.

---

## 🛠️ Common Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `D1 database not found` | `database_id` in `wrangler.toml` doesn't match remote database | Run `npx wrangler d1 list`, copy the real UUID, and update `wrangler.toml`. |
| `OAuth redirect_uri_mismatch` | Registered URI in Google/GitHub doesn't match | Ensure authorized redirect URL is exactly `https://blog.shreeharsha.online/api/auth/oauth/<provider>/callback`. |
| `Uploads fail with 500` | R2 bucket binding missing or uncreated | Run `npx wrangler r2 bucket create inkverse-media`. |
| `404 on page refresh` | SPA routing not configured | Verify [`wrangler.toml`](file:///home/shnl/Projects/Blog-website/wrangler.toml#L8) contains `not_found_handling = "single-page-application"`. |
| `Database schema missing tables` | Migrations only applied locally | Run `npm run d1:migrate:prod` to execute migrations against remote Cloudflare D1. |

---

## 🔄 Routine Updates & Redeployments

Whenever you make frontend or backend code changes, push updates live in one command:

```bash
npm run deploy
```
