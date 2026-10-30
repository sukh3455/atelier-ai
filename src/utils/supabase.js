import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mmjyroepqmtfncmjlnym.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tanlyb2VwcW10Zm5jbWpsbnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMjUyMjUsImV4cCI6MjEwODYwMTIyNX0.MOv0I8R3R-Fpw6K-E8pBeDO-T3849lB__LLZM9aUiRk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// ==============================================================================
// 1. AUTHENTICATION HELPERS
// ==============================================================================

/**
 * Sign up with Email and Password
 */
export async function signUpWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Sign in with Magic Link / OTP (Passwordless)
 */
export async function sendMagicLink(email) {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      }
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  try {
    await supabase.auth.signOut();
    return { error: null };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Get current authenticated session
 */
export async function getActiveSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

// ==============================================================================
// 2. CONVERSATION SYNC & 90% PRUNING HELPERS
// ==============================================================================

/**
 * Upsert / Save chat to Supabase.
 * Respects 'is_pinned' so pinned chats are protected from 90% auto-pruning.
 */
export async function syncChatToCloud(chat, userId) {
  if (!userId) return { success: false, error: 'User not logged in' };

  try {
    const payload = {
      id: chat.id,
      user_id: userId,
      title: chat.title || 'New Chat',
      messages: chat.messages || [],
      is_pinned: Boolean(chat.isPinned),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('conversations')
      .upsert(payload);

    if (error) {
      // If table is not yet created in Supabase SQL editor, handle gracefully
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Load all user conversations from cloud
 */
export async function loadUserChatsFromCloud(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error || !data) return null;

    return data.map(c => ({
      id: c.id,
      title: c.title,
      messages: c.messages || [],
      isPinned: Boolean(c.is_pinned),
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));
  } catch {
    return null;
  }
}

/**
 * Delete chat from cloud
 */
export async function deleteChatFromCloud(chatId, userId) {
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Toggle Pin status in cloud
 */
export async function togglePinInCloud(chatId, isPinned, userId) {
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('conversations')
      .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
      .eq('id', chatId)
      .eq('user_id', userId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Client-Side Smart Pruning Guard:
 * If total conversations exceed safe limits, automatically prune oldest unpinned chats.
 * Never touches pinned chats.
 */
export function pruneOldUnpinnedChats(chats, maxAllowance = 80) {
  if (!Array.isArray(chats) || chats.length <= maxAllowance) {
    return { chats, prunedCount: 0 };
  }

  const pinned = chats.filter(c => c.isPinned);
  const unpinned = chats.filter(c => !c.isPinned);

  const allowedUnpinnedCount = Math.max(10, maxAllowance - pinned.length);
  const keptUnpinned = unpinned.slice(0, allowedUnpinnedCount);
  const prunedCount = unpinned.length - keptUnpinned.length;

  return {
    chats: [...pinned, ...keptUnpinned],
    prunedCount
  };
}
