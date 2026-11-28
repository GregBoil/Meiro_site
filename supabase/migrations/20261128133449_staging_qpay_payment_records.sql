create table public.qpay_payments (
 order_id uuid primary key references public.orders(id) on delete restrict,
 invoice_id text unique,
 amount_mnt bigint not null check(amount_mnt>0),
 status text not null default 'creating' check(status in ('creating','pending','paid','cancelled','expired','unknown')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 verified_at timestamptz
);
alter table public.qpay_payments enable row level security;
revoke all on public.qpay_payments from public,anon,authenticated;
grant select,insert,update on public.qpay_payments to service_role;
create index qpay_payments_pending_idx on public.qpay_payments(created_at) where status in ('creating','pending','unknown');
