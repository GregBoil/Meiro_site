create unique index qpay_one_pending_order_per_user on public.orders(user_id) where payment_provider='qpay' and status='pending_payment';
