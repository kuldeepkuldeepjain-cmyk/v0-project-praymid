-- Run after all funded breach writers are updated. Keep balances, breach history,
-- suspensions, and explicit security restrictions unchanged.
WITH restored AS (
  UPDATE participants AS p
  SET account_frozen = FALSE, is_frozen = FALSE, status = 'active', updated_at = NOW()
  WHERE p.account_type = 'funded'
    AND p.funded_breach_status = 'breached'
    AND p.funded_breach_at IS NOT NULL
    AND p.funded_breach_balance = 0
    AND p.account_balance = 0
    AND p.account_frozen IS TRUE
    AND p.is_frozen IS TRUE
    AND p.status IN ('active', 'frozen')
    AND p.is_active IS TRUE
    AND p.otp_verified IS TRUE
    AND p.is_deleted IS NOT TRUE
    AND EXISTS (
      SELECT 1 FROM transactions AS t
      WHERE t.participant_id = p.id
        AND t.type = 'funded_drawdown_reset'
        AND t.created_at BETWEEN p.funded_breach_at - INTERVAL '1 second'
                             AND p.funded_breach_at + INTERVAL '1 minute'
    )
    AND NOT EXISTS (
      SELECT 1 FROM account_restrictions AS r
      WHERE LOWER(TRIM(r.participant_email)) = LOWER(TRIM(p.email))
        AND r.status = 'active'
        AND r.restriction_type::text IN ('login', 'full_account')
        AND (r.effective_until IS NULL OR r.effective_until > NOW())
    )
  RETURNING 1
)
SELECT COUNT(*)::int AS restored_sign_ins FROM restored;
