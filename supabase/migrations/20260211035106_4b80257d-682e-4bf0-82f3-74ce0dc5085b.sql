
-- Fix: restrict membership inserts to room creator or self-join
DROP POLICY "Authenticated can insert memberships" ON public.room_memberships;

CREATE POLICY "Room creator or self can insert memberships"
  ON public.room_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = room_id AND created_by = auth.uid()
    )
  );
