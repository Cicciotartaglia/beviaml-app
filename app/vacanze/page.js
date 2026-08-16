'use client'

import { useRouter } from 'next/navigation'
import { VACATIONS } from '../../lib/tableNames'
import styles from './vacanze.module.css'

/*
===============================================================================
PAGINA ARCHIVIO VACANZE
===============================================================================

Questa pagina mostra tutte le vacanze storiche disponibili.

Le vacanze non vengono cercate direttamente nel database.

La lista viene letta da:

    VACATIONS

definito in:

    lib/tableNames.js

Questo significa che per aggiungere una nuova vacanza futura
basterà aggiungere una nuova configurazione in VACATIONS.

Esempio:

    creta_2026
    ibiza_2027
    ...

Ogni card apre poi:

    /vacanze/[vacationId]

Esempio:

    /vacanze/creta_2026

===============================================================================
*/

export default function VacanzePage() {
    const router = useRouter()

    /*
     * VACATIONS è un oggetto.
     *
     * Lo convertiamo in array per poter usare .map().
     */
    const vacations =
        Object.values(VACATIONS)

    // ==========================================================================
    // FORMATTAZIONE DATE
    // ==========================================================================

    function formatDate(dateString) {
        if (!dateString) {
            return '—'
        }

        return new Date(
            dateString
        ).toLocaleDateString(
            'it-IT',
            {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }
        )
    }

    // ==========================================================================
    // INTERFACCIA
    // ==========================================================================

    return (
        <main className={styles.page}>
            <div className={styles.container}>

                {/* ================================================================
            HEADER
            ================================================================ */}

                <header className={styles.header}>
                    <div>
                        <div className={styles.eyebrow}>
                            ARCHIVIO
                        </div>

                        <h1 className={styles.title}>
                            Vecchie vacanze
                        </h1>

                        <p className={styles.subtitle}>
                            Rivedi classifiche, premi, grafici e bevute delle vacanze passate.
                        </p>
                    </div>

                    <button
                        className={styles.homeButton}
                        onClick={() =>
                            router.push('/home')
                        }
                        aria-label="Torna alla Home"
                    >
                        ←
                    </button>
                </header>

                {/* ================================================================
            ELENCO VACANZE
            ================================================================ */}

                <section className={styles.vacationsGrid}>
                    {vacations.map(
                        (vacation) => (
                            <article
                                key={vacation.id}
                                className={styles.vacationCard}
                            >
                                <div className={styles.cardTop}>
                                    <div>
                                        <div className={styles.cardStatus}>
                                            ARCHIVIATA
                                        </div>

                                        <h2 className={styles.cardTitle}>
                                            {vacation.title}
                                        </h2>
                                    </div>

                                    <div className={styles.archiveIcon}>
                                        🗂️
                                    </div>
                                </div>

                                <div className={styles.cardDates}>
                                    <div>
                                        <span>Dal</span>

                                        <strong>
                                            {formatDate(
                                                vacation.start
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Al</span>

                                        <strong>
                                            {formatDate(
                                                vacation.end
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <button
                                    className={styles.openButton}
                                    onClick={() =>
                                        router.push(
                                            `/vacanze/${vacation.id}`
                                        )
                                    }
                                >
                                    Apri recap
                                    <span>→</span>
                                </button>
                            </article>
                        )
                    )}
                </section>

                {/* ================================================================
            NESSUNA VACANZA
            ================================================================ */}

                {vacations.length === 0 && (
                    <div className={styles.emptyState}>
                        Nessuna vacanza archiviata.
                    </div>
                )}
            </div>
        </main>
    )
}