/*
===============================================================================
CONFIGURAZIONE TABELLE DATABASE E ARCHIVIO VACANZE
===============================================================================

Questo file ha DUE responsabilità distinte:

1. Decidere quali tabelle usa l'app "corrente"
   tramite ACTIVE_DATASET.

2. Descrivere le vacanze archiviate disponibili
   nella futura pagina "Vecchie vacanze".

Questo evita di spargere per il progetto nomi di tabelle hardcoded.

===============================================================================
*/


// ============================================================================
// DATASET ATTIVO DELL'APP
// ============================================================================

/*
 * Questo valore decide su quali tabelle lavora normalmente l'app.
 *
 * VALORI POSSIBILI:
 *
 * 'current'
 *     Vecchie tabelle originali:
 *
 *     users
 *     drink_logs
 *     daily_bac_peaks
 *
 *
 * 'creta_2026'
 *     Archivio storico della vacanza Creta 2026.
 *
 *     users_creta_2026
 *     drink_logs_creta_2026
 *     daily_bac_peaks_creta_2026
 *
 *
 * 'test'
 *     Ambiente utilizzato per lo sviluppo della V2.
 *
 *     users_test
 *     drink_logs_test
 *     daily_bac_peaks_test
 *
 *
 * IMPORTANTE:
 *
 * Durante lo sviluppo normale della V2
 * lasciamo:
 *
 *     ACTIVE_DATASET = 'test'
 *
 * Le vecchie vacanze potranno essere consultate
 * senza modificare ACTIVE_DATASET.
 */
/*
 * Dataset selezionato tramite variabile d'ambiente.
 *
 * Se la variabile non esiste, utilizziamo TEST come sicurezza.
 *
 * Questo permette di avere:
 *
 * PC locale  -> test
 * Vercel     -> limbo
 *
 * senza modificare il codice prima di ogni deploy.
 */
const ACTIVE_DATASET =
    process.env.NEXT_PUBLIC_ACTIVE_DATASET || 'test'


// ============================================================================
// DATASET DISPONIBILI
// ============================================================================

const DATASETS = {
    /*
     * Tabelle originali.
     *
     * Rimangono disponibili soprattutto per compatibilità
     * con la vecchia struttura del progetto.
     */
    current: {
        users: 'users',
        drinkLogs: 'drink_logs',
        dailyBacPeaks: 'daily_bac_peaks'
    },

    /*
     * Archivio storico di Creta 2026.
     *
     * Queste tabelle devono essere considerate
     * dati storici e non dati di sviluppo.
     */
    creta_2026: {
        users: 'users_creta_2026',
        drinkLogs: 'drink_logs_creta_2026',
        dailyBacPeaks: 'daily_bac_peaks_creta_2026'
    },

    /*
     * Ambiente di sviluppo della V2.
     */
    test: {
        users: 'users_test',
        drinkLogs: 'drink_logs_test',
        dailyBacPeaks: 'daily_bac_peaks_test'
    },
    /*
 * LIMBO
 *
 * Ambiente utilizzato dalla versione online dell'app
 * quando non è in corso una vacanza reale.
 *
 * I dati contenuti qui possono essere modificati
 * o cancellati senza conseguenze.
 */
    limbo: {
        users: 'users_limbo',
        drinkLogs: 'drink_logs_limbo',
        dailyBacPeaks: 'daily_bac_peaks_limbo'
    },
}


// ============================================================================
// TABELLE DEL DATASET ATTUALMENTE ATTIVO
// ============================================================================

/*
 * Recuperiamo automaticamente le tabelle
 * associate ad ACTIVE_DATASET.
 *
 * Esempio:
 *
 * se ACTIVE_DATASET = 'test'
 *
 * vacationTables diventa:
 *
 * {
 *   users: 'users_test',
 *   drinkLogs: 'drink_logs_test',
 *   dailyBacPeaks: 'daily_bac_peaks_test'
 * }
 */
const vacationTables = DATASETS[ACTIVE_DATASET]


// ============================================================================
// TABLES
// ============================================================================

/*
 * TABLES è l'oggetto utilizzato dalle normali pagine dell'app.
 *
 * Esempio:
 *
 * supabase
 *   .from(TABLES.drinkLogs)
 *   .select('*')
 *
 *
 * In questo modo le pagine non devono sapere
 * se stiamo lavorando su:
 *
 * drink_logs
 *
 * drink_logs_test
 *
 * oppure
 *
 * drink_logs_creta_2026
 */
export const TABLES = {
    // Tabelle legate alla vacanza/dataset attivo.
    users: vacationTables.users,
    drinkLogs: vacationTables.drinkLogs,
    dailyBacPeaks: vacationTables.dailyBacPeaks,

    // Tabelle condivise tra tutti gli ambienti.
    drinks: 'drinks',
    phrases: 'phrases',
    appConfig: 'app_config',
    keepAlive: 'keep_alive'
}


// ============================================================================
// NOME DATASET ATTIVO
// ============================================================================

/*
 * Esportiamo anche il nome del dataset attivo.
 *
 * Potrà essere utile soprattutto nell'Admin
 * per mostrare qualcosa del tipo:
 *
 *     DATABASE ATTIVO: TEST
 */
export const ACTIVE_DATASET_NAME = ACTIVE_DATASET


// ============================================================================
// ARCHIVIO VACANZE
// ============================================================================

/*
 * Questa struttura è SEPARATA da ACTIVE_DATASET.
 *
 * Serve alla futura pagina:
 *
 *     /vacanze
 *
 * e alle pagine di dettaglio:
 *
 *     /vacanze/creta_2026
 *
 *
 * L'obiettivo è poter consultare una vecchia vacanza
 * anche mentre l'app normale continua a lavorare
 * sulle tabelle di test.
 *
 *
 * In futuro, per aggiungere una nuova vacanza,
 * basterà aggiungere un nuovo blocco.
 *
 * Esempio:
 *
 * ibiza_2027: {
 *     ...
 * }
 */
export const VACATIONS = {
    creta_2026: {
        /*
         * Identificatore interno.
         *
         * Deve corrispondere alla parte finale dell'URL:
         *
         * /vacanze/creta_2026
         */
        id: 'creta_2026',

        /*
         * Titolo mostrato nell'interfaccia.
         */
        title: 'CRETA 2026',

        /*
         * Date della vacanza.
         *
         * Le useremo soprattutto per:
         *
         * - pagina archivio
         * - caricamento log
         * - statistiche
         * - grafici
         *
         * Se vogliamo possiamo affinare queste date
         * quando costruiamo la pagina archivio.
         */
        start: '2026-08-02T00:00:00',
        end: '2026-08-09T23:59:59',

        /*
         * Fuso orario locale della vacanza.
         *
         * Fondamentale per:
         *
         * - orari delle bevute
         * - giorni 08:00 -> 08:00
         * - picchi BAC
         * - storico
         */
        timezone: 'Europe/Athens',

        /*
         * Tabelle specifiche della vacanza.
         *
         * La pagina archivio userà direttamente
         * queste tabelle e NON TABLES.xxx.
         *
         * In questo modo ACTIVE_DATASET può restare 'test'.
         */
        tables: {
            users: 'users_creta_2026',
            drinkLogs: 'drink_logs_creta_2026',
            dailyBacPeaks: 'daily_bac_peaks_creta_2026'
        }
    }
}