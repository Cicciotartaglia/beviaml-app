/*
===============================================================================
CONFIGURAZIONE TABELLE DATABASE
===============================================================================

Il sistema vacanze ora è completamente dinamico.

La sessione attiva viene letta da:

    app_config
    key = active_vacation_slug

Le informazioni delle vacanze vengono invece lette da:

    vacations

Le tabelle specifiche della sessione vengono costruite
automaticamente a partire dallo slug.

Esempio:

    slug = "ibiza_2027"

produce:

    users_ibiza_2027
    drink_logs_ibiza_2027
    daily_bac_peaks_ibiza_2027

===============================================================================
*/


// ============================================================================
// TABELLE CONDIVISE
// ============================================================================

/*
 * Queste tabelle NON appartengono a una singola vacanza.
 *
 * Vengono utilizzate da tutte le sessioni.
 */
export const TABLES = {
    drinks: 'drinks',
    phrases: 'phrases',
    appConfig: 'app_config',
    keepAlive: 'keep_alive'
}


// ============================================================================
// TABELLE DI UNA SESSIONE DINAMICA
// ============================================================================

/*
 * Costruisce i nomi delle tabelle appartenenti
 * a una sessione a partire dal suo slug.
 *
 * Esempio:
 *
 * getVacationTables('test_sessione')
 *
 * restituisce:
 *
 * {
 *     users: 'users_test_sessione',
 *     drinkLogs: 'drink_logs_test_sessione',
 *     dailyBacPeaks: 'daily_bac_peaks_test_sessione'
 * }
 */
export function getVacationTables(slug) {
    if (!slug) {
        return null
    }

    return {
        users: `users_${slug}`,
        drinkLogs: `drink_logs_${slug}`,
        dailyBacPeaks: `daily_bac_peaks_${slug}`
    }
}