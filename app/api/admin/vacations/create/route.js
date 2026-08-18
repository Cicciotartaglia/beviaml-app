import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'

export async function POST(request) {
    const adminPassword =
        request.headers.get('x-admin-password')

    if (
        adminPassword !==
        process.env.ADMIN_PASSWORD
    ) {
        return NextResponse.json(
            {
                error: 'Non autorizzato'
            },
            {
                status: 401
            }
        )
    }
    try {
        const body =
            await request.json()

        const {
            title,
            slug,
            timezone = 'Europe/Rome',
            startAt,
            endAt
        } = body

        // ------------------------------------------------------------------------
        // VALIDAZIONE DATI
        // ------------------------------------------------------------------------

        if (!title || !slug) {
            return NextResponse.json(
                {
                    error:
                        'Titolo e slug sono obbligatori'
                },
                {
                    status: 400
                }
            )
        }

        /*
         * Lo slug viene utilizzato anche
         * nei nomi delle tabelle.
         *
         * Consentiamo solamente:
         *
         * - lettere minuscole
         * - numeri
         * - underscore
         */
        if (
            !/^[a-z0-9_]+$/.test(
                slug
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        'Slug non valido'
                },
                {
                    status: 400
                }
            )
        }

        // ------------------------------------------------------------------------
        // NOMI DELLE TABELLE
        // ------------------------------------------------------------------------

        const usersTable =
            `users_${slug}`

        const drinkLogsTable =
            `drink_logs_${slug}`

        const dailyBacPeaksTable =
            `daily_bac_peaks_${slug}`

        // ------------------------------------------------------------------------
        // CONTROLLO SESSIONE GIÀ ESISTENTE
        // ------------------------------------------------------------------------

        const {
            data: existingVacation,
            error: existingError
        } =
            await supabaseAdmin
                .from('vacations')
                .select('id, slug')
                .eq(
                    'slug',
                    slug
                )
                .maybeSingle()

        if (existingError) {
            throw existingError
        }

        if (existingVacation) {
            return NextResponse.json(
                {
                    error:
                        'Esiste già una sessione con questo slug'
                },
                {
                    status: 409
                }
            )
        }

        // ------------------------------------------------------------------------
        // CREAZIONE TABELLE
        // ------------------------------------------------------------------------

        /*
         * Chiamiamo la funzione Postgres:
         *
         *     create_vacation_tables()
         *
         * che crea:
         *
         * users_<slug>
         * drink_logs_<slug>
         * daily_bac_peaks_<slug>
         */
        const {
            error: tablesError
        } =
            await supabaseAdmin
                .rpc(
                    'create_vacation_tables',
                    {
                        p_slug:
                            slug
                    }
                )

        if (tablesError) {
            throw tablesError
        }

        // ------------------------------------------------------------------------
        // CREAZIONE RECORD VACATION
        // ------------------------------------------------------------------------

        const {
            data: vacation,
            error: vacationError
        } =
            await supabaseAdmin
                .from('vacations')
                .insert({
                    title,
                    slug,
                    timezone,

                    start_at:
                        startAt ||
                        null,

                    end_at:
                        endAt ||
                        null,

                    status:
                        'draft',

                    users_table:
                        usersTable,

                    drink_logs_table:
                        drinkLogsTable,

                    daily_bac_peaks_table:
                        dailyBacPeaksTable
                })
                .select()
                .single()

        if (vacationError) {
            throw vacationError
        }

        // ------------------------------------------------------------------------
        // RISPOSTA
        // ------------------------------------------------------------------------

        return NextResponse.json(
            {
                success: true,
                vacation
            },
            {
                status: 201
            }
        )

    } catch (error) {
        console.error(
            'Errore creazione sessione:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Errore durante la creazione della sessione'
            },
            {
                status: 500
            }
        )
    }
}