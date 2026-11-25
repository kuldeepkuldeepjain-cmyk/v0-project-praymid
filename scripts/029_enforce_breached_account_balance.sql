CREATE OR REPLACE FUNCTION public.enforce_breached_account_balance()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF (NEW.account_type = 'funded' AND NEW.funded_breach_status = 'breached')
    OR (NEW.account_type = 'challenge' AND (NEW.challenge_status = 'failed'
      OR (NEW.challenge_failed_at IS NOT NULL AND NEW.challenge_status IN ('pending_payment', 'payment_rejected')))) THEN
    NEW.account_balance := 0;
  END IF;
  RETURN NEW;
END
$function$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_breached_account_balance'
      AND tgrelid = 'public.participants'::regclass
  ) THEN
    CREATE TRIGGER enforce_breached_account_balance
      BEFORE INSERT OR UPDATE ON public.participants
      FOR EACH ROW EXECUTE FUNCTION public.enforce_breached_account_balance();
  END IF;
END
$migration$;
