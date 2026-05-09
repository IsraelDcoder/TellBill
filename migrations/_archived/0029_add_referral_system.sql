-- ✅ Referral System - Viral growth mechanism (critical for $0 ad budget)
-- MVP: Each user gets a code, refer 3 paying users → 1 month free

CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE, -- Each user has ONE referral code
  code TEXT NOT NULL UNIQUE,     -- Shortened referral code (8 chars)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ✅ Track successful referrals (when referred user upgrades to paid)
CREATE TABLE IF NOT EXISTS referral_conversions (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,       -- User who shared the referral code
  referred_user_id TEXT NOT NULL,   -- New user who signed up with code
  referral_code TEXT NOT NULL,      -- Code used
  status TEXT DEFAULT 'pending',    -- pending, converted, claimed
  converted_at TIMESTAMP WITH TIME ZONE,
  bonus_claimed_at TIMESTAMP WITH TIME ZONE,
  bonus_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(referrer_id, referred_user_id) -- Prevent double-counting
);

-- ✅ Track referral bonus status (1 month free for 3 conversions)
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  successful_referrals INT DEFAULT 0,  -- Count of conversions
  bonus_earned_at TIMESTAMP WITH TIME ZONE,
  bonus_redeemed_at TIMESTAMP WITH TIME ZONE,
  bonus_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_referrer ON referral_conversions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_referred ON referral_conversions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_code ON referral_conversions(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_user ON referral_bonuses(user_id);
