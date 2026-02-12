
-- Add message status for read receipts (sent -> delivered -> read)
ALTER TABLE public.messages ADD COLUMN status text NOT NULL DEFAULT 'sent';
ALTER TABLE public.messages ADD COLUMN file_url text;
ALTER TABLE public.messages ADD COLUMN file_name text;
ALTER TABLE public.messages ADD COLUMN file_type text;

-- Add last_seen for online/offline status
ALTER TABLE public.profiles ADD COLUMN last_seen timestamp with time zone DEFAULT now();

-- Create storage bucket for chat file attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

-- Storage policies for chat files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

-- Allow message senders to update their own message status (for marking as read)
CREATE POLICY "Room members can update message status"
ON public.messages FOR UPDATE
TO authenticated
USING (is_room_member(room_id))
WITH CHECK (is_room_member(room_id));

-- Create signaling table for WebRTC calls
CREATE TABLE public.call_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  type text NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'call-start', 'call-end', 'call-reject'
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view call signals"
ON public.call_signals FOR SELECT
TO authenticated
USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "Authenticated users can insert call signals"
ON public.call_signals FOR INSERT
TO authenticated
WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Participants can delete call signals"
ON public.call_signals FOR DELETE
TO authenticated
USING (caller_id = auth.uid() OR callee_id = auth.uid());

-- Enable realtime for call_signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
