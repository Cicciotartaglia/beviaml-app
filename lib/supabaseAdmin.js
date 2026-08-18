import { createClient } from '@supabase/supabase-js'

/*
===============================================================================
SUPABASE ADMIN CLIENT
===============================================================================

Questo client viene usato SOLO lato server.

Utilizza la Secret Key di Supabase, quindi può eseguire
operazioni amministrative che il normale client browser
non deve poter eseguire.

NON importare mai questo file dentro componenti con:

    'use client'

===============================================================================
*/

const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl) {
    throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL non configurato'
    )
}

if (!supabaseSecretKey) {
    throw new Error(
        'SUPABASE_SECRET_KEY non configurato'
    )
}

export const supabaseAdmin =
    createClient(
        supabaseUrl,
        supabaseSecretKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    )