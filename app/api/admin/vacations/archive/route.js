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
        } = await request.json()

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

        // -------------------------------------------------------------
        // CONTROLLIAMO LA SESSIONE
        // -------------------------------------------------------------

        const {
            data: vacation,
            error: vacationError
        } =
            await supabaseAdmin
                .from('vacations')
                .select('*')
                .eq(
                    'slug',
                    slug
                )
                .single()

        if (vacationError) {
            throw vacationError
        }

        if (
            vacation.status !==
            'active'
        ) {
            return NextResponse.json(
                {
                    error:
                        'Solo una sessione ACTIVE può essere archiviata'
                },
                {
                    status: 400
                }
            )
        }

        // -------------------------------------------------------------
        // ARCHIVIAMO LA SESSIONE
        // -------------------------------------------------------------

        const {
            error: archiveError
        } =
            await supabaseAdmin
                .from('vacations')
                .update({
                    status:
                        'archived'
                })
                .eq(
                    'slug',
                    slug
                )

        if (archiveError) {
            throw archiveError
        }

        // -------------------------------------------------------------
        // RIMUOVIAMO LA SESSIONE ATTIVA
        // -------------------------------------------------------------

        const {
            error: configError
        } =
            await supabaseAdmin
                .from('app_config')
                .update({
                    value: false,
                    text_value: null
                })
                .eq(
                    'key',
                    'active_vacation_slug'
                )

        if (configError) {
            throw configError
        }

        // -------------------------------------------------------------
        // VECCHIO FLAG VACANZA
        // -------------------------------------------------------------

        const {
            error: oldConfigError
        } =
            await supabaseAdmin
                .from('app_config')
                .update({
                    value: false
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
            'Errore archiviazione sessione:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error.message ||
                    'Errore durante l’archiviazione'
            },
            {
                status: 500
            }
        )
    }
}