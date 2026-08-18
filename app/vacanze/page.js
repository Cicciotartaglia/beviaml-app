'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import styles from './vacanze.module.css'

export default function VacanzePage() {
    const router = useRouter()

    // ==========================================================================
    // VACANZE ARCHIVIATE
    // ==========================================================================

    const [vacations, setVacations] = useState([])
    const [loading, setLoading] = useState(true)

    // ==========================================================================
    // CARICAMENTO ARCHIVIO
    // ==========================================================================

    useEffect(() => {
        async function loadVacations() {
            const {
                data,
                error
            } =
                await supabase
                    .from('vacations')
                    .select(`
                        id,
                        slug,
                        title,
                        start_at,
                        end_at,
                        timezone,
                        status
                    `)
                    .eq(
                        'status',
                        'archived'
                    )
                    .order(
                        'start_at',
                        {
                            ascending: false,
                            nullsFirst: false
                        }
                    )

            if (error) {
                console.error(
                    'Errore caricamento vacanze archiviate:',
                    error
                )

                setVacations([])
                setLoading(false)

                return
            }

            setVacations(
                data || []
            )

            setLoading(false)
        }

        loadVacations()
    }, [])

    // ==========================================================================
    // FORMATTAZIONE DATE
    // ==========================================================================

    function formatDate(
        dateString,
        timezone = 'Europe/Rome'
    ) {
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
                year: 'numeric',
                timeZone:
                    timezone ||
                    'Europe/Rome'
            }
        )
    }

    // ==========================================================================
    // INTERFACCIA
    // ==========================================================================

    return (
        <main
            className={
                styles.page
            }
        >
            <div
                className={
                    styles.container
                }
            >

                {/* ================================================================
                    HEADER
                    ================================================================ */}

                <header
                    className={
                        styles.header
                    }
                >
                    <div>
                        <div
                            className={
                                styles.eyebrow
                            }
                        >
                            ARCHIVIO
                        </div>

                        <h1
                            className={
                                styles.title
                            }
                        >
                            Vecchie vacanze
                        </h1>

                        <p
                            className={
                                styles.subtitle
                            }
                        >
                            Rivedi classifiche, premi, grafici e bevute delle vacanze passate.
                        </p>
                    </div>

                    <button
                        className={
                            styles.homeButton
                        }
                        onClick={() =>
                            router.push(
                                '/home'
                            )
                        }
                        aria-label="Torna alla Home"
                    >
                        ←
                    </button>
                </header>

                {/* ================================================================
                    CARICAMENTO
                    ================================================================ */}

                {loading && (
                    <div
                        className={
                            styles.emptyState
                        }
                    >
                        Caricamento archivio...
                    </div>
                )}

                {/* ================================================================
                    ELENCO VACANZE
                    ================================================================ */}

                {!loading && (
                    <section
                        className={
                            styles.vacationsGrid
                        }
                    >
                        {vacations.map(
                            (vacation) => (
                                <article
                                    key={
                                        vacation.id
                                    }
                                    className={
                                        styles.vacationCard
                                    }
                                >
                                    <div
                                        className={
                                            styles.cardTop
                                        }
                                    >
                                        <div>
                                            <div
                                                className={
                                                    styles.cardStatus
                                                }
                                            >
                                                ARCHIVIATA
                                            </div>

                                            <h2
                                                className={
                                                    styles.cardTitle
                                                }
                                            >
                                                {
                                                    vacation.title
                                                }
                                            </h2>
                                        </div>

                                        <div
                                            className={
                                                styles.archiveIcon
                                            }
                                        >
                                            🗂️
                                        </div>
                                    </div>

                                    <div
                                        className={
                                            styles.cardDates
                                        }
                                    >
                                        <div>
                                            <span>
                                                Dal
                                            </span>

                                            <strong>
                                                {formatDate(
                                                    vacation.start_at,
                                                    vacation.timezone
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Al
                                            </span>

                                            <strong>
                                                {formatDate(
                                                    vacation.end_at,
                                                    vacation.timezone
                                                )}
                                            </strong>
                                        </div>
                                    </div>

                                    <button
                                        className={
                                            styles.openButton
                                        }
                                        onClick={() =>
                                            router.push(
                                                `/vacanze/${vacation.slug}`
                                            )
                                        }
                                    >
                                        Apri recap

                                        <span>
                                            →
                                        </span>
                                    </button>
                                </article>
                            )
                        )}
                    </section>
                )}

                {/* ================================================================
                    NESSUNA VACANZA
                    ================================================================ */}

                {!loading &&
                    vacations.length === 0 && (
                        <div
                            className={
                                styles.emptyState
                            }
                        >
                            Nessuna vacanza archiviata.
                        </div>
                    )}

            </div>
        </main>
    )
}