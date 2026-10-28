-- Migration initiale : Schéma complet pour l'application de gestion de boutique
-- Monnaie : FCFA (nombres entiers sans décimales)
-- Rôles : 'patronne', 'vendeur'

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLE PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('patronne', 'vendeur')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Index pour recherche rapide
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_is_active on public.profiles(is_active);

-- 3. TABLE PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  selling_price bigint not null check (selling_price >= 0),
  cost_price bigint not null check (cost_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  alert_threshold integer not null default 5 check (alert_threshold >= 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_stock on public.products(stock_quantity);

-- 4. TABLE SALES
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  total_amount bigint not null check (total_amount >= 0),
  status text not null default 'validee' check (status in ('validee', 'annulee')),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_sales_seller on public.sales(seller_id);
create index if not exists idx_sales_created_at on public.sales(created_at desc);
create index if not exists idx_sales_status on public.sales(status);

-- 5. TABLE SALE_ITEMS
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  total_price bigint not null check (total_price >= 0),
  unit_cost_price bigint not null check (unit_cost_price >= 0)
);

create index if not exists idx_sale_items_sale on public.sale_items(sale_id);
create index if not exists idx_sale_items_product on public.sale_items(product_id);

-- 6. VUES SÉCURISÉES (Masquent le prix d'achat et le coût aux vendeurs)
create or replace view public.v_products as
select
  p.id,
  p.name,
  p.category,
  p.selling_price,
  case
    when (select role from public.profiles where id = auth.uid()) = 'patronne' then p.cost_price
    else null
  end as cost_price,
  p.stock_quantity,
  p.alert_threshold,
  p.created_at,
  p.updated_at
from public.products p;

create or replace view public.v_sale_items as
select
  si.id,
  si.sale_id,
  si.product_id,
  si.quantity,
  si.unit_price,
  si.total_price,
  case
    when (select role from public.profiles where id = auth.uid()) = 'patronne' then si.unit_cost_price
    else null
  end as unit_cost_price
from public.sale_items si;

-- 7. FONCTIONS ATOMIQUES

-- Fonction d'enregistrement de vente avec décrément atomique et verrouillage de ligne
create or replace function public.create_sale(
  p_seller_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_item jsonb;
  v_prod_id uuid;
  v_req_qty int;
  v_prod_name text;
  v_unit_price bigint;
  v_cost_price bigint;
  v_curr_stock int;
  v_item_total bigint;
  v_grand_total bigint := 0;
  v_caller_role text;
  v_caller_active boolean;
begin
  -- Vérifier le statut du vendeur
  select role, is_active into v_caller_role, v_caller_active
  from public.profiles
  where id = p_seller_id;

  if not found then
    raise exception 'Vendeur introuvable.';
  end if;

  if v_caller_active is not true then
    raise exception 'Ce compte vendeur est désactivé. Vente refusée.';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Le panier de vente est vide.';
  end if;

  -- 1ère passe : Verrouillage FOR UPDATE et validation stricte du stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_prod_id := (v_item->>'product_id')::uuid;
    v_req_qty := (v_item->>'quantity')::int;

    if v_req_qty is null or v_req_qty <= 0 then
      raise exception 'La quantité doit être supérieure à zéro.';
    end if;

    select name, selling_price, stock_quantity
    into v_prod_name, v_unit_price, v_curr_stock
    from public.products
    where id = v_prod_id
    for update;

    if not found then
      raise exception 'Produit introuvable (ID: %).', v_prod_id;
    end if;

    if v_curr_stock < v_req_qty then
      raise exception 'Stock insuffisant pour "%" (disponible : %, demandé : %).', v_prod_name, v_curr_stock, v_req_qty;
    end if;

    v_grand_total := v_grand_total + (v_unit_price * v_req_qty);
  end loop;

  -- Création de la vente
  insert into public.sales (seller_id, total_amount, status)
  values (p_seller_id, v_grand_total, 'validee')
  returning id into v_sale_id;

  -- 2ème passe : Insertion des lignes de vente et décrémentation
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_prod_id := (v_item->>'product_id')::uuid;
    v_req_qty := (v_item->>'quantity')::int;

    select selling_price, cost_price
    into v_unit_price, v_cost_price
    from public.products
    where id = v_prod_id;

    v_item_total := v_unit_price * v_req_qty;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, total_price, unit_cost_price)
    values (v_sale_id, v_prod_id, v_req_qty, v_unit_price, v_item_total, v_cost_price);

    update public.products
    set stock_quantity = stock_quantity - v_req_qty,
        updated_at = timezone('utc'::text, now())
    where id = v_prod_id;
  end loop;

  return jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'total_amount', v_grand_total
  );
end;
$$;

-- Fonction d'annulation de vente réservée à la patronne
create or replace function public.cancel_sale(
  p_sale_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_role text;
  v_sale_status text;
  v_item record;
begin
  -- Vérifier rôle patronne
  select role into v_user_role
  from public.profiles
  where id = p_user_id;

  if v_user_role is null or v_user_role <> 'patronne' then
    raise exception 'Seule la patronne a le droit d''annuler une vente.';
  end if;

  select status into v_sale_status
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'Vente introuvable.';
  end if;

  if v_sale_status = 'annulee' then
    raise exception 'Cette vente est déjà marquée comme annulée.';
  end if;

  -- Restauration du stock
  for v_item in
    select product_id, quantity
    from public.sale_items
    where sale_id = p_sale_id
  loop
    update public.products
    set stock_quantity = stock_quantity + v_item.quantity,
        updated_at = timezone('utc'::text, now())
    where id = v_item.product_id;
  end loop;

  -- Marquer comme annulée
  update public.sales
  set status = 'annulee',
      cancelled_at = timezone('utc'::text, now()),
      cancelled_by = p_user_id
  where id = p_sale_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Vente annulée avec succès et stock restauré.'
  );
end;
$$;

-- Fonction de réapprovisionnement réservée à la patronne
create or replace function public.restock_product(
  p_product_id uuid,
  p_additional_quantity int,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_role text;
  v_new_stock int;
begin
  select role into v_user_role from public.profiles where id = p_user_id;
  if v_user_role is null or v_user_role <> 'patronne' then
    raise exception 'Seule la patronne peut réapprovisionner le stock.';
  end if;

  if p_additional_quantity <= 0 then
    raise exception 'La quantité ajoutée doit être supérieure à zéro.';
  end if;

  update public.products
  set stock_quantity = stock_quantity + p_additional_quantity,
      updated_at = timezone('utc'::text, now())
  where id = p_product_id
  returning stock_quantity into v_new_stock;

  if not found then
    raise exception 'Produit introuvable.';
  end if;

  return jsonb_build_object(
    'success', true,
    'new_stock', v_new_stock
  );
end;
$$;

-- 8. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

-- Fonction d'aide pour obtenir le rôle de l'utilisateur courant sans boucle RLS
create or replace function public.get_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- RLS PROFILES
-- Tous les utilisateurs authentifiés peuvent lire leur propre profil et les noms des collègues actifs
create policy "Lecture profils autorisée"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.get_current_role() = 'patronne'
  or (is_active = true)
);

-- Seule la patronne peut créer, modifier ou supprimer des profils
create policy "Patronne gère les profils"
on public.profiles for all
to authenticated
using (public.get_current_role() = 'patronne')
with check (public.get_current_role() = 'patronne');

-- RLS PRODUCTS
-- Tous les utilisateurs authentifiés actifs peuvent voir les produits
create policy "Lecture produits authentifiés"
on public.products for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  )
);

-- Seule la patronne peut insérer, mettre à jour ou supprimer des produits
create policy "Patronne modifie les produits"
on public.products for insert
to authenticated
with check (public.get_current_role() = 'patronne');

create policy "Patronne met à jour les produits"
on public.products for update
to authenticated
using (public.get_current_role() = 'patronne')
with check (public.get_current_role() = 'patronne');

create policy "Patronne supprime les produits"
on public.products for delete
to authenticated
using (public.get_current_role() = 'patronne');

-- RLS SALES
-- La patronne voit tout. Le vendeur ne voit que ses propres ventes.
create policy "Lecture ventes filtrée par rôle"
on public.sales for select
to authenticated
using (
  public.get_current_role() = 'patronne'
  or seller_id = auth.uid()
);

-- Insertion de vente (via fonction create_sale ou direct par le vendeur lui-même)
create policy "Création de vente par le vendeur connecté"
on public.sales for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  )
);

-- Seule la patronne peut mettre à jour une vente (pour annulation)
create policy "Patronne annule les ventes"
on public.sales for update
to authenticated
using (public.get_current_role() = 'patronne')
with check (public.get_current_role() = 'patronne');

-- Interdiction de supprimer physiquement les ventes (traçabilité)
create policy "Aucune suppression de vente"
on public.sales for delete
to authenticated
using (false);

-- RLS SALE_ITEMS
-- La patronne voit tous les articles vendus. Le vendeur voit ceux de ses propres ventes.
create policy "Lecture articles vendus"
on public.sale_items for select
to authenticated
using (
  public.get_current_role() = 'patronne'
  or exists (
    select 1 from public.sales s
    where s.id = sale_items.sale_id and s.seller_id = auth.uid()
  )
);

-- Insertion autorisée dans le cadre d'une vente valide
create policy "Insertion articles vendus"
on public.sale_items for insert
to authenticated
with check (
  exists (
    select 1 from public.sales s
    where s.id = sale_items.sale_id and s.seller_id = auth.uid()
  )
);
