CREATE TABLE IF NOT EXISTS wallet_blind (
    userid TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT wallet_address_check CHECK (LENGTH(wallet_address) = 42)
);

