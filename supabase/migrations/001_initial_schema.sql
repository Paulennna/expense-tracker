

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING; 
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);




CREATE TABLE IF NOT EXISTS public.bank_connections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id        TEXT NOT NULL,
  plaid_access_token   TEXT NOT NULL,  -- NEVER return this to the client!
  institution_name     TEXT NOT NULL DEFAULT 'Unknown Bank',
  status               TEXT NOT NULL DEFAULT 'active', -- 'active', 'error', 'revoked'
  cursor               TEXT,           -- Plaid transactions/sync cursor; NULL = never synced
  last_synced_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  
  UNIQUE(user_id, plaid_item_id)
);

-- RLS: Users can only access their own bank connections
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read their own connections
CREATE POLICY "Users can view own bank connections"
  ON public.bank_connections FOR SELECT
  USING (auth.uid() = user_id);

--  Settings screen "Remove" button works:
CREATE POLICY "Users can delete own bank connections"
  ON public.bank_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass: edge functions use service role key which bypasses RLS automatically


-- ─── TRANSACTIONS ────────────────────────────────────────────
-- Stores all synced transactions from Plaid.
-- plaid_transaction_id is UNIQUE — used for upsert deduplication.

CREATE TABLE IF NOT EXISTS public.transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_connection_id    UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  plaid_transaction_id  TEXT UNIQUE NOT NULL,  -- Plaid's ID — used for deduplication on sync
  name                  TEXT,                  -- Transaction description from bank
  merchant_name         TEXT,                  -- Cleaner merchant name (when available)
  amount                NUMERIC(12, 2),        -- Positive = expense, negative = income (Plaid convention)
  iso_currency_code     TEXT DEFAULT 'USD',
  date                  DATE NOT NULL,
  category              TEXT DEFAULT 'Uncategorized',  -- Our category label
  pending               BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast date-range queries (common on dashboard + transactions list)
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions(date DESC);

-- Index for user-specific queries
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON public.transactions(user_id, date DESC);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS transactions_category_idx ON public.transactions(user_id, category);

-- RLS: Users can only see their own transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only edge functions (service role) can insert/update/delete transactions.
-- Users cannot directly write to this table.



-- ─── VERIFICATION QUERIES ────────────────────────────────────
-- Run these to verify your schema after applying:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
