
-- Add bio column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT NULL;

-- Enable realtime for messages table (idempotent - will error if already added, that's fine)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
