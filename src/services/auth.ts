import { supabase } from '../lib/supabase'

export const authService = {
  async logUserEvent(event: string, payload: any) {
    try {
      await supabase.from('user_events').insert([
        {
          event,
          payload,
          ts: new Date().toISOString(),
        },
      ])
    } catch {}
  },
}
