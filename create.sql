CREATE TABLE IF NOT EXISTS wallet_blind (
    userid TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT wallet_address_check CHECK (LENGTH(wallet_address) = 42)
);

-- Giveaways table
create table giveaways (
  id uuid default uuid_generate_v4() primary key,
  message_id text not null,
  channel_id text not null,
  end_time timestamp with time zone not null,
  winners_count integer not null,
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- Giveaway participants table
create table giveaway_participants (
  id uuid default uuid_generate_v4() primary key,
  giveaway_id uuid references giveaways(id),
  user_id text not null,
  wallet_address text not null,
  created_at timestamp with time zone default now(),
  unique(giveaway_id, user_id)
);

