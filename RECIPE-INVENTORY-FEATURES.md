# Recipe / BOM Inventory Upgrade

Implemented in both the MERN backend and the active Supabase/React frontend.

## Included
- Ingredient master with base units and cost
- Recipe and RecipeIngredient BOM
- Unit conversion (g/kg, ml/l, pcs)
- Automatic ingredient deduction on order item creation (FEFO batches)
- Automatic cancellation reversal
- Wastage recording with FEFO batch consumption
- Production batch model and ingredient consumption API
- Batch and expiry tracking
- Food-cost report API and Supabase view
- Recipe/Ingredient management screen in the frontend
- Supabase migration for the same data model and transaction-safe triggers

## Important
Run the new Supabase migration before using the React/Supabase recipe screens.

For the MERN backend, configure MongoDB as a replica set/managed cluster because order, recipe, wastage and production flows use transactions.

## Verification
- Backend JavaScript syntax check: passed.
- Frontend TypeScript typecheck: passed.
- Vite production build could not be executed in this environment because the supplied vendor `node_modules` lacked the Linux Rollup optional binary. `node_modules` is intentionally excluded from this release; run `npm install` then `npm run build`.
