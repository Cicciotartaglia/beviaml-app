'use client'

import { useRouter } from 'next/navigation'
import styles from './standby.module.css'

/*
===============================================================================
PAGINA STANDBY / LIMBO
===============================================================================

Questa pagina viene mostrata quando NON è in corso una vacanza reale.

In modalità Limbo non ha senso mostrare:

- BAC
- pulsanti per registrare bevute
- classifica giornaliera
- statistiche
- pagina Vacanza corrente

L'utente può solamente:

1. consultare le vecchie vacanze;
2. entrare nell'Admin.

===============================================================================
*/

export default function StandbyPage() {
    const router = useRouter()

    return (
        <main className={styles.page}>
            <div className={styles.container}>

                <div className={styles.badge}>
                    STANDBY
                </div>

                <h1 className={styles.title}>
                    Nessuna vacanza attiva
                </h1>

                <p className={styles.description}>
                    L'app è momentaneamente in pausa.
                    Puoi comunque rivedere classifiche,
                    premi, grafici e bevute delle vacanze passate.
                </p>

                <div className={styles.actions}>
                    <button
                        className={styles.primaryButton}
                        onClick={() =>
                            router.push('/vacanze')
                        }
                    >
                        Vecchie vacanze
                        <span>→</span>
                    </button>

                    <button
                        className={styles.secondaryButton}
                        onClick={() =>
                            router.push('/admin')
                        }
                    >
                        Admin
                    </button>
                </div>

                <div className={styles.footer}>
                    La prossima sessione comparirà qui
                    quando verrà attivata.
                </div>

            </div>
        </main>
    )
}