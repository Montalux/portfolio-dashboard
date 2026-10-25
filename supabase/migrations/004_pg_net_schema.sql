-- Keep extensions out of the API-exposed public schema (advisor 0014).
-- pg_net functions stay in schema "net", so the cron job keeps working.
drop extension if exists pg_net;
create extension pg_net schema extensions;
