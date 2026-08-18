import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'

export async function POST(request) {
    const adminPassword =
        request.headers.get(
            'x-admin-password'
        )

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
        const {
            slug
        } =
            await request.json()

        if (!slug) {
            return NextResponse.json(
                {
                    error:
                        'Slug obbligatorio'
                },
                {
                    status: 400
                }
            )
        }

        /*
         * Controlliamo che la sessione esista.
         */
        const {
            data: vacation,
            error: vacationError
        } =
            await supabaseAdmin
                .from('vacations')
                .select('*')
                .eq('slug', slug)
                .single()

        if (vacationError) {
            throw vacationError
        }

        if (
            vacation.status !==
            'draft'
        ) {
            return NextResponse.json(
                {
                    error:
                        'Solo una sessione DRAFT può essere attivata'
                },
                {
                    status: 400
                }
            )
        }

        /*
         * Per sicurezza disattiviamo eventuali
         * altre sessioni ACTIVE.
         */
        const {
            error: resetError
        } =
            await supabaseAdmin
                .from('vacations')
                .update({
                    status: 'draft'
                })
                .eq(
                    'status',
                    'active'
                )

        if (resetError) {
            throw resetError
        }

        /*
         * Rendiamo attiva la sessione scelta.
         */
        const {
            error: activateError
        } =
            await supabaseAdmin
                .from('vacations')
                .update({
                    status: 'active'
                })
                .eq(
                    'slug',
                    slug
                )

        if (activateError) {
            throw activateError
        }

        /*
         * Salviamo anche lo slug della sessione attiva
         * dentro app_config.
         */
        const {
            error: configError
        } =
            await supabaseAdmin
                .from('app_config')
                .update({
                    value: true,
                    text_value: slug
                })
                .eq(
                    'key',
                    'active_vacation_slug'
                )

        if (configError) {
            throw configError
        }

        /*
         * Manteniamo compatibilità con
         * il vecchio flag vacanza_attiva.
         */
        const {
            error: oldConfigError
        } =
            await supabaseAdmin
                .from('app_config')
                .update({
                    value: true
                })
                .eq(
                    'key',
                    'vacanza_attiva'
                )

        if (oldConfigError) {
            throw oldConfigError
        }

        return NextResponse.json({
            success: true,
            slug
        })

    } catch (error) {
        console.error(
            'Errore attivazione sessione:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Errore durante l’attivazione'
            },
            {
                status: 500
            }
        )
    }
}