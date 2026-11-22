-- Fix for 20261223110000: the chat rule runs as the person sending, and they weren't allowed to use
-- the helper it calls, so every chat message was refused ("permission denied"). Let them use it.
grant execute on function private.chat_text_for_check(text) to anon, authenticated;
