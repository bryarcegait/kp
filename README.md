# Kanto't Pakpakan — Restaurant Management System

Responsive management system built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, Prisma, and TiDB.

## Stack

- Next.js 16 (App Router, Server Actions)
- TypeScript + Tailwind CSS v4 + shadcn/ui (Radix)
- Prisma ORM → TiDB Serverless (MySQL-compatible)
- Auth.js (NextAuth v5) — username/password login, role-based permissions
- Vercel Blob — receipt and menu image uploads

## First-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a TiDB Serverless cluster** at [tidbcloud.com](https://tidbcloud.com) (free tier). From the cluster's "Connect" tab, copy the connection string (Node.js / General format).

3. **Copy the env file and fill it in**

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — the TiDB connection string from step 2
   - `AUTH_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - `BLOB_READ_WRITE_TOKEN` — from your Vercel project's Storage tab (Blob). Required in production for receipt and menu image uploads. The app also accepts Vercel's generated `BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN`. Can be left empty for local dev; uploads will save to `public/uploads/` instead until it's set.
   - `LOYVERSE_ACCESS_TOKEN` — Loyverse API token with receipt read/write and catalog read permissions.
   - `LOYVERSE_STORE_ID` — Loyverse store used when sending online orders as receipts.
   - `LOYVERSE_EMPLOYEE_ID` — optional Loyverse employee attached to online receipts.
   - `LOYVERSE_CASH_PAYMENT_TYPE_ID`, `LOYVERSE_GCASH_PAYMENT_TYPE_ID`, `LOYVERSE_BANK_TRANSFER_PAYMENT_TYPE_ID` — Loyverse payment type IDs used when sending orders.

4. **Push the schema and seed the database**

   ```bash
   npm run db:push
   npm run db:seed
   ```

   This creates the permissions, the System Admin / Manager / Staff roles, and the first admin account:

   - Username: `bryarcega`
   - Password: `dropDown`

   **Change this password after your first login** (Users page → edit your account).

5. **Run the app**

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000.

## Deploying

1. Push this project to a Git repository and import it into Vercel.
2. Add the same three environment variables in the Vercel project settings.
3. Enable Vercel Blob storage for the project (Storage tab → Create → Blob) and copy its token into `BLOB_READ_WRITE_TOKEN`.
4. Deploy. Run `npm run db:push` and `npm run db:seed` once (locally, pointed at the production `DATABASE_URL`, or via a one-off Vercel job) to set up the production database.

## User roles & permissions

Three roles are seeded by default — **System Admin**, **Manager**, **Staff** — each with different access to Expenses/Users/Roles. A System Admin can create additional custom roles and adjust any role's permissions from the **Roles** page.

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:seed` | Seed permissions, roles, and the admin account |
| `npm run db:studio` | Open Prisma Studio to browse data |
