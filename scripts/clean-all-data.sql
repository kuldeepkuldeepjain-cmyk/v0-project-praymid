-- =====================================================
-- FLOWCHAIN DATABASE CLEANUP SCRIPT
-- Deletes ALL data while preserving schema structure
-- =====================================================

BEGIN;

-- Display cleanup summary
DO $$
DECLARE
  p_count INT; pr_count INT; w_count INT; t_count INT;
  ps_count INT; tr_count INT; sc_count INT; pred_count INT;
  ga_count INT; st_count INT; n_count INT; al_count INT;
BEGIN
  SELECT COUNT(*) INTO p_count FROM participants;
  SELECT COUNT(*) INTO pr_count FROM payout_requests;
  SELECT COUNT(*) INTO w_count FROM wallet_pool;
  SELECT COUNT(*) INTO t_count FROM topup_requests;
  SELECT COUNT(*) INTO ps_count FROM payment_submissions;
  SELECT COUNT(*) INTO tr_count FROM transactions;
  SELECT COUNT(*) INTO sc_count FROM spin_coupons;
  SELECT COUNT(*) INTO pred_count FROM predictions;
  SELECT COUNT(*) INTO ga_count FROM gas_approvals;
  SELECT COUNT(*) INTO st_count FROM support_tickets;
  SELECT COUNT(*) INTO n_count FROM notifications;
  SELECT COUNT(*) INTO al_count FROM activity_logs;
  
  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE 'Records to be deleted:';
  RAISE NOTICE 'Participants: %', p_count;
  RAISE NOTICE 'Payout Requests: %', pr_count;
  RAISE NOTICE 'Wallet Pool: %', w_count;
  RAISE NOTICE 'Topup Requests: %', t_count;
  RAISE NOTICE 'Payment Submissions: %', ps_count;
  RAISE NOTICE 'Transactions: %', tr_count;
  RAISE NOTICE 'Spin Coupons: %', sc_count;
  RAISE NOTICE 'Predictions: %', pred_count;
  RAISE NOTICE 'Gas Approvals: %', ga_count;
  RAISE NOTICE 'Support Tickets: %', st_count;
  RAISE NOTICE 'Notifications: %', n_count;
  RAISE NOTICE 'Activity Logs: %', al_count;
  RAISE NOTICE '══════════════════════════════════════';
END $$;

-- Disable triggers
SET session_replication_role = 'replica';

-- Delete child records first
DELETE FROM payout_audit_logs;
DELETE FROM activity_logs;
DELETE FROM notifications;
DELETE FROM support_tickets;
DELETE FROM gas_approvals;
DELETE FROM predictions;
DELETE FROM spin_coupons;
DELETE FROM transactions;
DELETE FROM payment_submissions;
DELETE FROM topup_requests;
DELETE FROM wallet_pool;
DELETE FROM payout_requests;
DELETE FROM invite_logs;
DELETE FROM user_contacts;
DELETE FROM participants;

-- Reset sequences
ALTER SEQUENCE IF EXISTS participants_participant_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payout_requests_id_seq RESTART WITH 1;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify cleanup
DO $$
DECLARE
  p_count INT; pr_count INT; w_count INT; total INT := 0;
BEGIN
  SELECT COUNT(*) INTO p_count FROM participants;
  SELECT COUNT(*) INTO pr_count FROM payout_requests;
  SELECT COUNT(*) INTO w_count FROM wallet_pool;
  total := p_count + pr_count + w_count;
  
  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE 'Verification:';
  RAISE NOTICE 'Participants: %', p_count;
  RAISE NOTICE 'Payout Requests: %', pr_count;
  RAISE NOTICE 'Wallet Pool: %', w_count;
  
  IF total = 0 THEN
    RAISE NOTICE '✅ SUCCESS: Database cleaned';
  ELSE
    RAISE NOTICE '⚠️  % records remain', total;
  END IF;
  RAISE NOTICE 'Completed: %', NOW();
  RAISE NOTICE '══════════════════════════════════════';
END $$;

COMMIT;
