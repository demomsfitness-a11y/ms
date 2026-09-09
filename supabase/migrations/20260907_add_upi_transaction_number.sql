-- Migration: Add upi_transaction_number to payments table
-- Safe idempotent migration: checks if column exists before creating it
-- Preserves all existing payment records without modification

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'upi_transaction_number'
  ) THEN 
    ALTER TABLE public.payments ADD COLUMN upi_transaction_number TEXT NULL;
    RAISE NOTICE 'Added column upi_transaction_number to public.payments';
  ELSE
    RAISE NOTICE 'Column upi_transaction_number already exists in public.payments';
  END IF; 
END $$;

-- Also add index for fast transaction lookups
CREATE INDEX IF NOT EXISTS idx_payments_upi_txn ON public.payments(upi_transaction_number);
