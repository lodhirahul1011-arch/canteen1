-- Recipe/BOM inventory extension for the Canteen ERP frontend.
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sku text unique,
  base_unit text not null check (base_unit in ('g','kg','ml','l','pcs')),
  cost_per_base_unit numeric(12,4) not null default 0 check (cost_per_base_unit >= 0),
  reorder_level numeric(14,4) not null default 0 check (reorder_level >= 0),
  expiry_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.food_items(id) on delete cascade,
  yield_quantity numeric(14,4) not null default 1 check (yield_quantity > 0),
  yield_unit text not null default 'portion',
  version integer not null default 1,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(food_id)
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit text not null check (unit in ('g','kg','ml','l','pcs')),
  waste_percent numeric(6,2) not null default 0 check (waste_percent between 0 and 100),
  created_at timestamptz not null default now(),
  unique(recipe_id, ingredient_id)
);

create table if not exists public.ingredient_batches (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  batch_no text not null,
  quantity numeric(14,4) not null default 0 check (quantity >= 0),
  unit text not null check (unit in ('g','kg','ml','l','pcs')),
  unit_cost numeric(12,4) not null default 0 check (unit_cost >= 0),
  received_at timestamptz not null default now(),
  expiry_date date,
  active boolean not null default true
);

create table if not exists public.ingredient_ledger (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  batch_id uuid references public.ingredient_batches(id) on delete set null,
  entry_type text not null check (entry_type in ('PURCHASE','SALE_CONSUMPTION','PRODUCTION_CONSUMPTION','WASTAGE','RETURN','ADJUSTMENT')),
  quantity_change numeric(14,4) not null,
  unit text not null check (unit in ('g','kg','ml','l','pcs')),
  balance_after numeric(14,4) not null check (balance_after >= 0),
  reference_type text,
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.wastage_entries (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  batch_id uuid references public.ingredient_batches(id) on delete set null,
  quantity numeric(14,4) not null check (quantity > 0),
  unit text not null check (unit in ('g','kg','ml','l','pcs')),
  reason text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_recipe_ingredients_recipe on public.recipe_ingredients(recipe_id);
create index if not exists idx_batches_ingredient_expiry on public.ingredient_batches(ingredient_id, expiry_date);
create index if not exists idx_ingredient_ledger_ingredient_created on public.ingredient_ledger(ingredient_id, created_at desc);

alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.ingredient_batches enable row level security;
alter table public.ingredient_ledger enable row level security;
alter table public.wastage_entries enable row level security;

-- Existing app is an authenticated ERP UI; authenticated users can operate the module.
do $$ begin
  create policy "authenticated read ingredients" on public.ingredients for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated write ingredients" on public.ingredients for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated read recipes" on public.recipes for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated write recipes" on public.recipes for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated read recipe ingredients" on public.recipe_ingredients for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated write recipe ingredients" on public.recipe_ingredients for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated read batches" on public.ingredient_batches for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated write batches" on public.ingredient_batches for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated read ledger" on public.ingredient_ledger for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated write ledger" on public.ingredient_ledger for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated read wastage" on public.wastage_entries for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated write wastage" on public.wastage_entries for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Transaction-safe recipe consumption, wastage, production and food-cost logic.
create or replace function public.convert_inventory_unit(q numeric, from_unit text, to_unit text)
returns numeric language plpgsql immutable as $$
begin
  if from_unit = to_unit then return q; end if;
  if from_unit in ('g','kg') and to_unit in ('g','kg') then
    return q * case when from_unit='kg' then 1000 else 1 end / case when to_unit='kg' then 1000 else 1 end;
  end if;
  if from_unit in ('ml','l') and to_unit in ('ml','l') then
    return q * case when from_unit='l' then 1000 else 1 end / case when to_unit='l' then 1000 else 1 end;
  end if;
  if from_unit='pcs' and to_unit='pcs' then return q; end if;
  raise exception 'Cannot convert % to %', from_unit, to_unit;
end $$;

create or replace function public.consume_recipe_for_order()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  r record; ri record; ing record; b record;
  required_qty numeric; remaining numeric; take_qty numeric; new_balance numeric;
begin
  if new.food_item_id is null or new.quantity <= 0 then return new; end if;
  select * into r from recipes where food_id=new.food_item_id and active=true limit 1;
  if not found then return new; end if;

  for ri in select * from recipe_ingredients where recipe_id=r.id loop
    select * into ing from ingredients where id=ri.ingredient_id and active=true;
    if not found then raise exception 'Recipe ingredient is inactive'; end if;

    required_qty := public.convert_inventory_unit(
      (ri.quantity / r.yield_quantity) * new.quantity * (1 + ri.waste_percent/100),
      ri.unit, ing.base_unit
    );
    remaining := required_qty;

    for b in
      select * from ingredient_batches
      where ingredient_id=ing.id and active=true and quantity > 0
      order by expiry_date nulls last, received_at, id
      for update
    loop
      exit when remaining <= 0;
      take_qty := least(b.quantity, remaining);
      new_balance := b.quantity - take_qty;
      update ingredient_batches set quantity=new_balance, active=(new_balance > 0) where id=b.id;
      insert into ingredient_ledger(ingredient_id,batch_id,entry_type,quantity_change,unit,balance_after,reference_type,reference_id,notes)
      values(ing.id,b.id,'SALE_CONSUMPTION',-take_qty,ing.base_unit,new_balance,'ORDER',new.order_id,'Recipe consumption for '||new.food_name);
      remaining := remaining - take_qty;
    end loop;

    if remaining > 0.000001 then
      raise exception 'Insufficient ingredient stock for %', ing.name using errcode='P0001';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists trg_recipe_order_item on public.order_items;
create trigger trg_recipe_order_item
after insert on public.order_items
for each row execute function public.consume_recipe_for_order();

create or replace function public.reverse_recipe_on_cancel()
returns trigger language plpgsql security definer set search_path=public as $$
declare e record; b record; restored numeric;
begin
  if old.status <> 'cancelled' and new.status='cancelled' then
    for e in
      select * from ingredient_ledger
      where reference_type='ORDER' and reference_id=new.id and entry_type='SALE_CONSUMPTION'
    loop
      select * into b from ingredient_batches where id=e.batch_id for update;
      if found then
        restored := b.quantity + abs(e.quantity_change);
        update ingredient_batches set quantity=restored, active=true where id=b.id;
        insert into ingredient_ledger(ingredient_id,batch_id,entry_type,quantity_change,unit,balance_after,reference_type,reference_id,notes)
        values(e.ingredient_id,e.batch_id,'RETURN',abs(e.quantity_change),e.unit,restored,'ORDER',new.id,'Order cancellation reversal');
      end if;
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists trg_recipe_order_cancel on public.orders;
create trigger trg_recipe_order_cancel
after update of status on public.orders
for each row execute function public.reverse_recipe_on_cancel();

-- Wastage RPC: FEFO by default, or a specific batch when batch_id is supplied.
create or replace function public.record_ingredient_wastage(
  p_ingredient_id uuid, p_quantity numeric, p_unit text, p_reason text, p_notes text default null, p_batch_id uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare ing record; b record; remaining numeric; take_qty numeric; wid uuid;
begin
  if p_quantity <= 0 then raise exception 'Wastage quantity must be positive'; end if;
  select * into ing from ingredients where id=p_ingredient_id and active=true;
  if not found then raise exception 'Ingredient not found'; end if;
  remaining := public.convert_inventory_unit(p_quantity,p_unit,ing.base_unit);

  insert into wastage_entries(ingredient_id,batch_id,quantity,unit,reason,notes)
  values(p_ingredient_id,p_batch_id,remaining,ing.base_unit,p_reason,p_notes) returning id into wid;

  for b in
    select * from ingredient_batches
    where ingredient_id=p_ingredient_id and active=true and quantity > 0
      and (p_batch_id is null or id=p_batch_id)
    order by expiry_date nulls last, received_at, id
    for update
  loop
    exit when remaining <= 0;
    take_qty := least(b.quantity,remaining);
    update ingredient_batches set quantity=quantity-take_qty, active=(quantity-take_qty > 0) where id=b.id;
    insert into ingredient_ledger(ingredient_id,batch_id,entry_type,quantity_change,unit,balance_after,reference_type,reference_id,notes)
    select p_ingredient_id,b.id,'WASTAGE',-take_qty,ing.base_unit,quantity,'WASTAGE',wid,p_reason
    from ingredient_batches where id=b.id;
    remaining := remaining-take_qty;
  end loop;
  if remaining > 0.000001 then
    raise exception 'Insufficient ingredient stock for wastage';
  end if;
  return wid;
end $$;

create table if not exists public.production_batches (
 id uuid primary key default gen_random_uuid(),
 food_id uuid not null references food_items(id) on delete restrict,
 batch_no text not null unique,
 planned_quantity numeric(14,4) not null check(planned_quantity>0),
 produced_quantity numeric(14,4) not null check(produced_quantity>0),
 unit text not null default 'portion',
 produced_at timestamptz not null default now(),
 expiry_date date,
 status text not null default 'COMPLETED',
 created_at timestamptz not null default now()
);
create index if not exists idx_production_food_date on production_batches(food_id,produced_at desc);
alter table public.production_batches enable row level security;
drop policy if exists "anon_all_production_batches" on public.production_batches;
create policy "anon_all_production_batches" on public.production_batches for all to anon, authenticated using(true) with check(true);

-- Food-cost report: ingredient recipe cost per sale portion.
create or replace view public.food_cost_report as
select
  f.id as food_id,
  f.name,
  f.price as selling_price,
  coalesce(sum((ri.quantity / nullif(r.yield_quantity,0))
      * public.convert_inventory_unit(1, ri.unit, i.base_unit)
      * i.cost_per_base_unit),0) as ingredient_cost,
  f.price - coalesce(sum((ri.quantity / nullif(r.yield_quantity,0))
      * public.convert_inventory_unit(1, ri.unit, i.base_unit)
      * i.cost_per_base_unit),0) as gross_margin
from food_items f
left join recipes r on r.food_id=f.id and r.active=true
left join recipe_ingredients ri on ri.recipe_id=r.id
left join ingredients i on i.id=ri.ingredient_id
group by f.id,f.name,f.price;

alter table public.ingredient_batches enable row level security;
alter table public.ingredient_ledger enable row level security;
alter table public.wastage_entries enable row level security;
drop policy if exists "anon_all_ingredient_batches" on public.ingredient_batches;
create policy "anon_all_ingredient_batches" on public.ingredient_batches for all to anon, authenticated using(true) with check(true);
drop policy if exists "anon_all_ingredient_ledger" on public.ingredient_ledger;
create policy "anon_all_ingredient_ledger" on public.ingredient_ledger for all to anon, authenticated using(true) with check(true);
drop policy if exists "anon_all_wastage_entries" on public.wastage_entries;
create policy "anon_all_wastage_entries" on public.wastage_entries for all to anon, authenticated using(true) with check(true);
