-- AlterEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'TxType' AND e.enumlabel = 'DEPLOY_GUARD') THEN
    ALTER TYPE "TxType" ADD VALUE 'DEPLOY_GUARD';
  END IF;
END
$$;
