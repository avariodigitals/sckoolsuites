-- Payment methods for schools
CREATE TABLE IF NOT EXISTS payment_method (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL CHECK (code IN ('CASH', 'CHEQUE', 'POS', 'CARD', 'BANK_TRANSFER')),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, code)
);

-- Default seed: all payment methods, inactive by default, admin activates what they need
INSERT INTO payment_method (school_id, name, code, is_active, sort_order)
VALUES
    ('default', 'Cash', 'CASH', true, 1),
    ('default', 'Cheque', 'CHEQUE', false, 2),
    ('default', 'POS', 'POS', false, 3),
    ('default', 'Card (Online)', 'CARD', false, 4),
    ('default', 'Bank Transfer', 'BANK_TRANSFER', false, 5)
ON CONFLICT (school_id, code) DO NOTHING;

-- Bank accounts for school (multiple accounts possible)
CREATE TABLE IF NOT EXISTS school_bank_account (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT,
    branch TEXT,
    instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
