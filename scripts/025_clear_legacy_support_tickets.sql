-- Clear legacy support conversations created before participant-scoped support history.
-- Preserve the support_tickets table and its participant isolation for new requests.
DELETE FROM support_tickets;
