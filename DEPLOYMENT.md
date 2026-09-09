# Canteen ERP — Production Deployment

## Dashboard analytics
The main dashboard now loads live analytics from the reports API for MASTER_ADMIN, ADMIN and STAFF:
- total/completed/cancelled orders
- revenue
- purchases
- low-stock count
- top-selling foods
- inventory units/value

## Production environment
Frontend uses `VITE_API_URL` when supplied and otherwise `/api/v1`, so the same-origin production setup does not depend on localhost. Vite proxies `/api` to the local backend during development.

Backend production requires:
- `MONGO_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`

Use HTTPS and set `COOKIE_SECURE=true`. If using `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true` is mandatory.

## Demo users / seed
The old hard-coded demo passwords have been removed. The seed script is disabled in production and only runs when `SEED_DEMO_USERS=true` in development, with all four `SEED_*_PASSWORD` values supplied through environment variables.

## MongoDB transactions
The ERP uses MongoDB transactions, so production MongoDB must support transactions. Use a MongoDB replica set, sharded cluster, or managed MongoDB deployment that provides transaction support. The included Compose file starts a single-node replica set named `rs0` for development/testing.

Example local URI:
`mongodb://127.0.0.1:27017/canteen_erp?replicaSet=rs0`

## Release checklist
- [ ] Set `VITE_API_URL` to the production API base URL (or keep `/api/v1` for same-origin reverse proxy).
- [ ] Set a real `CORS_ORIGIN`.
- [ ] Generate unique long JWT secrets.
- [ ] Enable secure cookies and HTTPS.
- [ ] Use a replica set / sharded / managed MongoDB deployment.
- [ ] Do not run the demo seed in production.
- [ ] Keep `.env` files out of source control.
- [ ] Run `npm run build` in frontend before release.
