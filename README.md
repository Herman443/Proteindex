# Proteindex

Proteindex er en Next.js-app som rangerer dagligvarer i Norge etter:

- protein per krone
- protein per kalori
- protein per kalori per krone

Datakilden er Kassalapp API (`kassal.app/api`).

## 1. Lokal oppstart

Installer avhengigheter:

```bash
npm install
```

Initialiser lokal database og Prisma-klient:

```bash
npm run db:push
npm run db:generate
```

Lag lokal miljøfil:

```bash
copy .env.example .env.local
```

Start appen:

```bash
npm run dev
```

Åpne http://localhost:3000.

## 2. Miljøvariabler

Legg inn disse i `.env.local`:

- `KASSALAPP_API_KEY`
- `KASSALAPP_BASE_URL` (default: `https://kassal.app/api`)
- `DATABASE_URL`

## 3. GitHub-setup

Kjør dette i prosjektmappen:

```bash
git init
git add .
git commit -m "chore: initialize Proteindex with Next.js"
```

Opprett så et tomt repo på GitHub, og koble det til:

```bash
git branch -M main
git remote add origin https://github.com/<brukernavn>/proteindex.git
git push -u origin main
```

## 4. Datasync-strategi (plan)

- Kall `GET /products?size=100&page=1...N` til alle sider er hentet.
- Respekter rate limit ved å vente minst 1 sekund mellom requests.
- Kjør sync én gang per døgn via cron/scheduler.
- Regn ut ranking-felter ved ingest eller via materialized view.

## 5. Neste steg

## 6. MVP som er implementert

- SQLite + Prisma for lagring av produkter og sync-historikk
- sync-script som henter side for side fra Kassalapp (`size=100`, `page=1..N`)
- rate limit-hensyn med minst 1 sekund mellom requests
- ranking-felter lagres i databasen:
	- protein per krone
	- protein per kalori
	- protein per kalori per krone
- frontend som viser tre topplister

## 7. Nyttige kommandoer

Kjor datasync manuelt:

```bash
npm run sync
```

Bygg API-toppliste (eksempel):

```txt
GET /api/rankings?metric=proteinPerKrone&limit=20
```

Manuell sync via API:

```txt
POST /api/sync
```
