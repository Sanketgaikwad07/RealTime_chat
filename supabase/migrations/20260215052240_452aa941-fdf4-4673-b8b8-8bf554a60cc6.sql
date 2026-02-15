-- Fix: Allow room creator to also view their rooms (they haven't added memberships yet at creation time)
DROP POLICY IF EXISTS "Members can view their rooms" ON public.chat_rooms;

CREATE POLICY "Members can view their rooms"
ON public.chat_rooms FOR SELECT
USING (is_room_member(id) OR created_by = auth.uid());

-- Also add chat_rooms to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;