import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { useEffect, useState } from 'react'

let globalClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function useSupabase() {
  const [client] = useState(() => {
    if (!globalClient) {
      globalClient = createClientComponentClient<Database>()
    }
    return globalClient
  })

  return client
} 