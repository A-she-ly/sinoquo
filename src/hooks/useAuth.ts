import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type AppUser = {
  id: string
  email: string
  role?: 'sinodriller-sale' | 'supplier' | 'customer'
}

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (mounted) {
        const s = data.session
        if (s?.user) {
          setUser({ id: s.user.id, email: s.user.email || '' })
        } else {
          const soft = localStorage.getItem('soft_user')
          if (soft) {
            const u = JSON.parse(soft)
            setUser({ id: u.id, email: u.email, role: u.role })
          } else {
            setUser(null)
          }
        }
        setLoading(false)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' })
      } else {
        const soft = localStorage.getItem('soft_user')
        if (soft) {
          const u = JSON.parse(soft)
          setUser({ id: u.id, email: u.email, role: u.role })
        } else {
          setUser(null)
        }
      }
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
