import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mmjyroepqmtfncmjlnym.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tanlyb2VwcW10Zm5jbWpsbnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMjUyMjUsImV4cCI6MjEwODYwMTIyNX0.MOv0I8R3R-Fpw6K-E8pBeDO-T3849lB__LLZM9aUiRk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Syncs conversations to Supabase if the 'chats' table exists.
 * Gracefully falls back if table is not yet initialized in Supabase SQL editor.
 */
export async function syncChatToCloud(chat) {
  try {
    const { error } = await supabase
      .from('conversations')
      .upsert({
        id: chat.id,
        title: chat.title,
        messages: chat.messages,
        updated_at: new Date().toISOString()
      });
    if (error) {
      // Table might not exist yet - that's completely fine, local storage keeps it safe
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Loads all conversations from Supabase cloud
 */
export async function loadChatsFromCloud() {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !data) return null;
    return data;
  } catch (err) {
    return null;
  }
}
