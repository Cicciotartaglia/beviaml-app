'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    useParams,
    useRouter
} from 'next/navigation'

import {
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'

import {
    TABLES
} from '../../../lib/tableNames'

import { supabase } from '../../../lib/supabase'

/*
 * Riutilizziamo ESATTAMENTE lo stesso CSS
 * della pagina Vacanza corrente.
 *
 * In questo modo eventuali miglioramenti grafici futuri
 * verranno applicati automaticamente anche all'archivio.
 */
import styles from '../../vacanza/vacanza.module.css'

/*
===============================================================================
PAGINA VACANZA - V2
===============================================================================

Questa pagina mostra il riepilogo COMPLESSIVO dell'intera vacanza.

A differenza della pagina Gruppo, che analizza una singola giornata
08:00 -> 08:00, questa pagina utilizza tutti i dati appartenenti
alla vacanza corrente.

FUNZIONI PRINCIPALI
-------------------------------------------------------------------------------

1. Contatori complessivi:
   - birre
   - drink/cocktail
   - shot

2. Premi finali:
   - Giorno del giudizio
   - Instancabile
   - 24 ore di fama

3. Classifica grammi totali

4. Classifica grammi / peso
   - nuova nella V2
   - permette un confronto più equo tra utenti di peso diverso

5. Classifica Picco BAC

6. Grafico andamento vacanza:
   - grammi cumulativi
   - una linea per utente
   - un punto per giornata

7. Distribuzione bevande per utente:
   - birra
   - cocktail
   - shot
   - grafico a torta


IMPORTANTE
-------------------------------------------------------------------------------

I grafici derivano esclusivamente dai drink_logs già registrati.

Non introduciamo nuovi dati nel database.

Il grafico temporale utilizza i timestamp di registrazione,
quindi eventuali bevute inserite a posteriori rimangono associate
all'orario in cui sono state registrate.

===============================================================================
*/

export default function VacanzaPage() {
    const router = useRouter()

    /*
 * Recuperiamo la parte dinamica dell'URL.
 *
 * Esempio:
 *
 * /vacanze/creta_2026
 *
 * produce:
 *
 * id = "creta_2026"
 */
    const params = useParams()


    const vacationId =
        Array.isArray(params?.id)
            ? params.id[0]
            : params?.id

    /*
     * Cerchiamo la configurazione corrispondente
     * dentro VACATIONS.
     */
    const [vacation, setVacation] = useState(null)
    const [vacationResolved, setVacationResolved] = useState(false)


    useEffect(() => {
        let cancelled = false

        async function loadVacationConfig() {
            if (!vacationId) {
                return
            }

            const {
                data,
                error
            } =
                await supabase
                    .from('vacations')
                    .select(`
                    slug,
                    title,
                    timezone,
                    start_at,
                    end_at,
                    users_table,
                    drink_logs_table,
                    daily_bac_peaks_table,
                    status
                `)
                    .eq(
                        'slug',
                        vacationId
                    )
                    .maybeSingle()

            if (cancelled) {
                return
            }

            if (
                error ||
                !data
            ) {
                console.error(
                    'Vacanza non trovata:',
                    error
                )

                setVacation(null)
                setVacationResolved(true)

                return
            }

            setVacation({
                ...data,

                tables: {
                    users:
                        data.users_table,

                    drinkLogs:
                        data.drink_logs_table,

                    dailyBacPeaks:
                        data.daily_bac_peaks_table
                }
            })

            setVacationResolved(true)
        }

        loadVacationConfig()

        return () => {
            cancelled = true
        }
    }, [vacationId])

    // ==========================================================================
    // CONFIGURAZIONE VACANZA
    // ==========================================================================

    /*
     * Per ora titolo e inizio vacanza rimangono hardcoded,
     * esattamente come nella versione precedente.
     *
     * Quando realizzeremo "Archivio vacanze", questi dati
     * verranno probabilmente recuperati da una configurazione.
     */
    // ==========================================================================
    // CONFIGURAZIONE VACANZA ARCHIVIATA
    // ==========================================================================

    /*
     * Tutte queste informazioni arrivano da:
     *
     * lib/tableNames.js -> VACATIONS
     *
     * Quindi questa pagina non contiene più
     * riferimenti specifici a Creta.
     */
    const VACANZA_TITLE =
        vacation?.title || ''

    const VACATION_TIMEZONE =
        vacation?.timezone || 'UTC'

    // ==========================================================================
    // STATO DELLA PAGINA
    // ==========================================================================

    /*
     * Classifica visualizzata.
     *
     * alcohol -> grammi totali
     * relative -> grammi / kg
     * peak -> Picco BAC
     */
    const [activeTab, setActiveTab] = useState('alcohol')

    /*
     * Mostra/nasconde la classifica completa.
     */
    const [showFullRanking, setShowFullRanking] = useState(false)

    /*
     * Dati base caricati da Supabase.
     */
    const [logs, setLogs] = useState([])
    const [drinks, setDrinks] = useState([])
    const [users, setUsers] = useState([])
    const [peaks, setPeaks] = useState([])

    /*
     * Contatori complessivi.
     */
    const [counters, setCounters] = useState({
        beer: 0,
        cocktail: 0,
        shot: 0
    })

    /*
     * Classifiche.
     */
    const [rankingAlcohol, setRankingAlcohol] = useState([])
    const [rankingRelative, setRankingRelative] = useState([])
    const [rankingPeak, setRankingPeak] = useState([])

    /*
     * Premi finali.
     */
    const [judgmentDayAward, setJudgmentDayAward] = useState(null)
    const [consistencyAward, setConsistencyAward] = useState(null)
    const [bestDayAward, setBestDayAward] = useState(null)

    /*
     * Utente attualmente selezionato
     * per il grafico a torta.
     */
    const [selectedPieUserId, setSelectedPieUserId] = useState(null)

    /*
 * Filtri utilizzati nel registro completo delle bevute.
 *
 * 'all' significa che non viene applicato alcun filtro
 * per quella categoria.
 */
    const [historyUserId, setHistoryUserId] = useState('all')
    const [historyDay, setHistoryDay] = useState('all')

    // ==========================================================================
    // COLORI
    // ==========================================================================

    /*
     * Una linea diversa per ogni partecipante.
     *
     * I colori rimangono stabili in base all'ordine degli utenti.
     */
    const USER_COLORS = [
        '#0A84FF',
        '#30D158',
        '#FF9F0A',
        '#FF453A',
        '#BF5AF2',
        '#64D2FF',
        '#FFD60A',
        '#FF375F'
    ]

    /*
     * Colori utilizzati nel grafico a torta.
     */
    const DRINK_CATEGORY_COLORS = {
        beer: '#FF9F0A',
        cocktail: '#BF5AF2',
        shot: '#0A84FF'
    }

    // ==========================================================================
    // UTILITY: GRAMMI DI ALCOL
    // ==========================================================================

    /*
     * Converte una bevanda nei grammi di etanolo puro contenuti.
     */
    function gramsOfAlcohol(drink) {
        return (
            Number(drink.volume_ml) *
            (Number(drink.perc_alc) / 100) *
            0.789
        )
    }

    // ==========================================================================
    // UTILITY: GIORNATA 08:00 -> 08:00
    // ==========================================================================

    /*
     * Restituisce l'inizio della giornata alcolica
     * a cui appartiene un determinato timestamp.
  
     * La giornata parte alle 08:00.
     */
    function getAlcoholDayStart(timestamp) {
        const date = new Date(timestamp)

        const start = new Date(date)

        start.setHours(
            8,
            0,
            0,
            0
        )

        if (date.getHours() < 8) {
            start.setDate(
                start.getDate() - 1
            )
        }

        return start
    }

    // ==========================================================================
    // CARICAMENTO LOG VACANZA
    // ==========================================================================

    /*
     * Recupera tutti i drink_logs della vacanza.
     *
     * Li ordiniamo cronologicamente perché ci serviranno
     * anche per costruire il grafico.
     */
    // ==========================================================================
    // CARICAMENTO LOG DELLA VACANZA ARCHIVIATA
    // ==========================================================================

    /*
     * Una vacanza archiviata possiede una propria tabella drink_logs.
     *
     * Esempio Creta:
     *
     *     drink_logs_creta_2026
     *
     * Non abbiamo quindi bisogno di filtrare per data:
     * possiamo leggere direttamente tutta la tabella.
     */
    async function loadVacationLogs() {
        if (!vacation) {
            return []
        }

        const { data, error } =
            await supabase
                .from(
                    vacation.tables.drinkLogs
                )
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending: true
                    }
                )

        if (error) {
            console.error(
                'Errore caricamento drink_logs archivio:',
                error
            )

            return []
        }

        return data || []
    }

    // ==========================================================================
    // CARICAMENTO PICCHI BAC
    // ==========================================================================

    // ==========================================================================
    // CARICAMENTO PICCHI BAC DELLA VACANZA ARCHIVIATA
    // ==========================================================================

    /*
     * Anche i picchi BAC hanno una tabella dedicata
     * alla singola vacanza.
     */
    async function loadVacationPeaks() {
        if (!vacation) {
            return []
        }

        const { data, error } =
            await supabase
                .from(
                    vacation.tables.dailyBacPeaks
                )
                .select('*')

        if (error) {
            console.error(
                'Errore caricamento picchi BAC archivio:',
                error
            )

            return []
        }

        return data || []
    }
    // ==========================================================================
    // CONTATORI TOTALI
    // ==========================================================================

    function computeCounters(
        logs,
        drinks
    ) {
        const result = {
            beer: 0,
            cocktail: 0,
            shot: 0
        }

        for (const log of logs) {
            const drink =
                drinks.find(
                    (d) =>
                        String(d.id) ===
                        String(log.drink_id)
                )

            if (!drink) continue

            if (
                drink.category ===
                'beer'
            ) {
                result.beer++
            }

            if (
                drink.category ===
                'cocktail'
            ) {
                result.cocktail++
            }

            if (
                drink.category ===
                'shot'
            ) {
                result.shot++
            }
        }

        return result
    }

    // ==========================================================================
    // CLASSIFICA GRAMMI TOTALI
    // ==========================================================================

    function computeAlcoholRanking(
        logs,
        drinks,
        users
    ) {
        const userMap = {}

        /*
         * Creiamo una voce per ogni utente.
         */
        for (const user of users) {
            userMap[user.id] = {
                userId:
                    user.id,

                name:
                    user.nickname,

                weight:
                    Number(user.peso_kg),

                totalGrams: 0
            }
        }

        /*
         * Sommiamo i grammi di ogni bevuta.
         */
        for (const log of logs) {
            const drink =
                drinks.find(
                    (d) =>
                        String(d.id) ===
                        String(log.drink_id)
                )

            if (!drink) continue

            const entry =
                userMap[
                log.user_id
                ]

            if (!entry) continue

            entry.totalGrams +=
                gramsOfAlcohol(
                    drink
                )
        }

        /*
         * Classifica:
         *
         * 1. più grammi
         * 2. minor peso in caso di parità
         */
        return Object
            .values(userMap)
            .sort(
                (a, b) => {
                    if (
                        b.totalGrams !==
                        a.totalGrams
                    ) {
                        return (
                            b.totalGrams -
                            a.totalGrams
                        )
                    }

                    return (
                        a.weight -
                        b.weight
                    )
                }
            )
    }

    // ==========================================================================
    // CLASSIFICA GRAMMI / PESO
    // ==========================================================================

    /*
     * Nuova classifica V2.
  
     * Formula:
  
     *      grammi totali
     *      -------------
     *         peso kg
  
     * Esempio:
  
     * 150 g / 60 kg = 2,50 g/kg
     * 180 g / 95 kg = 1,89 g/kg
  
     * In questo modo un utente molto leggero non deve necessariamente
     * bere gli stessi grammi assoluti di uno molto pesante
     * per poter competere.
     */
    function computeRelativeRanking(
        alcoholRanking
    ) {
        return alcoholRanking
            .map(
                (entry) => {
                    const gramsPerKg =
                        entry.weight > 0
                            ? entry.totalGrams /
                            entry.weight
                            : 0

                    return {
                        ...entry,
                        gramsPerKg
                    }
                }
            )
            .sort(
                (a, b) =>
                    b.gramsPerKg -
                    a.gramsPerKg
            )
    }

    // ==========================================================================
    // CLASSIFICA PICCO BAC
    // ==========================================================================

    function computeVacationPeakRanking(
        peaks,
        users
    ) {
        const userMap = {}

        for (const user of users) {
            userMap[user.id] = {
                userId:
                    user.id,

                name:
                    user.nickname,

                weight:
                    Number(
                        user.peso_kg
                    ),

                peakBac: 0,
                peakTime: null
            }
        }

        /*
         * Ogni utente può avere più picchi giornalieri.
         *
         * Manteniamo soltanto il massimo assoluto.
         */
        for (const peak of peaks) {
            const current =
                userMap[
                peak.user_id
                ]

            if (!current) continue

            const bacValue =
                Number(
                    peak.peak_bac
                )

            if (
                bacValue >
                current.peakBac
            ) {
                userMap[
                    peak.user_id
                ] = {
                    ...current,

                    peakBac:
                        bacValue,

                    peakTime:
                        peak.peak_time
                }
            }
        }

        return Object
            .values(userMap)
            .sort(
                (a, b) => {
                    if (
                        b.peakBac !==
                        a.peakBac
                    ) {
                        return (
                            b.peakBac -
                            a.peakBac
                        )
                    }

                    return (
                        a.weight -
                        b.weight
                    )
                }
            )
    }

    // ==========================================================================
    // PREMIO: GIORNO DEL GIUDIZIO
    // ==========================================================================

    /*
     * Giornata in cui il gruppo nel suo complesso
     * ha registrato più grammi.
     */
    function computeJudgmentDayAward(
        logs,
        drinks
    ) {
        const dailyMap = {}

        for (const log of logs) {
            const dayStart =
                getAlcoholDayStart(
                    log.created_at
                )

            const key =
                dayStart.toISOString()

            if (!dailyMap[key]) {
                dailyMap[key] = {
                    dayStart,
                    totalGrams: 0
                }
            }

            const drink =
                drinks.find(
                    (d) =>
                        String(d.id) ===
                        String(log.drink_id)
                )

            if (!drink) continue

            dailyMap[
                key
            ].totalGrams +=
                gramsOfAlcohol(
                    drink
                )
        }

        const allDays =
            Object
                .values(dailyMap)
                .sort(
                    (a, b) =>
                        b.totalGrams -
                        a.totalGrams
                )

        return (
            allDays[0] ||
            null
        )
    }

    // ==========================================================================
    // PREMIO: INSTANCABILE
    // ==========================================================================

    /*
     * Vince chi supera 90 g nel maggior numero di giornate.
     */
    function computeConsistencyAward(
        logs,
        drinks,
        users
    ) {
        const THRESHOLD = 90

        const userDayMap = {}
        const perUserPerDay = {}

        for (const user of users) {
            userDayMap[
                user.id
            ] = {
                userId:
                    user.id,

                name:
                    user.nickname,

                weight:
                    Number(
                        user.peso_kg
                    ),

                daysAboveThreshold: 0,
                totalGrams: 0
            }
        }

        for (const log of logs) {
            const drink =
                drinks.find(
                    (d) =>
                        String(d.id) ===
                        String(log.drink_id)
                )

            if (!drink) continue

            const entry =
                userDayMap[
                log.user_id
                ]

            if (!entry) continue

            const dayStart =
                getAlcoholDayStart(
                    log.created_at
                )

            const dayKey =
                dayStart.toISOString()

            if (
                !perUserPerDay[
                log.user_id
                ]
            ) {
                perUserPerDay[
                    log.user_id
                ] = {}
            }

            if (
                !perUserPerDay[
                log.user_id
                ][dayKey]
            ) {
                perUserPerDay[
                    log.user_id
                ][dayKey] = 0
            }

            const grams =
                gramsOfAlcohol(
                    drink
                )

            perUserPerDay[
                log.user_id
            ][dayKey] += grams

            entry.totalGrams +=
                grams
        }

        /*
         * Conta quante giornate superano 90 g.
         */
        for (
            const userId in
            perUserPerDay
        ) {
            for (
                const dayKey in
                perUserPerDay[
                userId
                ]
            ) {
                if (
                    perUserPerDay[
                    userId
                    ][dayKey] >=
                    THRESHOLD
                ) {
                    userDayMap[
                        userId
                    ].daysAboveThreshold++
                }
            }
        }

        const ranking =
            Object
                .values(
                    userDayMap
                )
                .sort(
                    (a, b) => {
                        if (
                            b.daysAboveThreshold !==
                            a.daysAboveThreshold
                        ) {
                            return (
                                b.daysAboveThreshold -
                                a.daysAboveThreshold
                            )
                        }

                        if (
                            b.totalGrams !==
                            a.totalGrams
                        ) {
                            return (
                                b.totalGrams -
                                a.totalGrams
                            )
                        }

                        return (
                            a.weight -
                            b.weight
                        )
                    }
                )

        return (
            ranking[0] ||
            null
        )
    }

    // ==========================================================================
    // PREMIO: 24 ORE DI FAMA
    // ==========================================================================

    /*
     * Miglior singola giornata individuale.
     */
    function computeBestSingleDayAward(
        logs,
        drinks,
        users
    ) {
        const perUserPerDay = {}

        for (const log of logs) {
            const drink =
                drinks.find(
                    (d) =>
                        String(d.id) ===
                        String(log.drink_id)
                )

            if (!drink) continue

            const dayStart =
                getAlcoholDayStart(
                    log.created_at
                )

            const dayKey =
                dayStart.toISOString()

            if (
                !perUserPerDay[
                log.user_id
                ]
            ) {
                perUserPerDay[
                    log.user_id
                ] = {}
            }

            if (
                !perUserPerDay[
                log.user_id
                ][dayKey]
            ) {
                perUserPerDay[
                    log.user_id
                ][dayKey] = {
                    totalGrams: 0,
                    dayStart
                }
            }

            perUserPerDay[
                log.user_id
            ][dayKey].totalGrams +=
                gramsOfAlcohol(
                    drink
                )
        }

        let best = null

        for (const user of users) {
            const userDays =
                perUserPerDay[
                user.id
                ] || {}

            for (
                const dayKey in
                userDays
            ) {
                const entry =
                    userDays[
                    dayKey
                    ]

                if (
                    !best ||
                    entry.totalGrams >
                    best.totalGrams
                ) {
                    best = {
                        userId:
                            user.id,

                        name:
                            user.nickname,

                        totalGrams:
                            entry.totalGrams,

                        dayStart:
                            entry.dayStart
                    }
                }
            }
        }

        return best
    }

    // ==========================================================================
    // FORMATTAZIONE
    // ==========================================================================

    function formatTime(
        timestamp
    ) {
        if (!timestamp) {
            return '—'
        }

        return new Date(
            timestamp
        ).toLocaleString(
            'it-IT',
            {
                weekday:
                    'long',

                day:
                    'numeric',

                hour:
                    '2-digit',

                minute:
                    '2-digit',

                timeZone:
                    VACATION_TIMEZONE
            }
        )
    }

    function formatAwardDay(
        date
    ) {
        if (!date) {
            return ''
        }

        return new Date(
            date
        ).toLocaleDateString(
            'it-IT',
            {
                weekday:
                    'long',

                day:
                    'numeric',

                month:
                    'long',

                timeZone:
                    VACATION_TIMEZONE
            }
        )
    }

    /*
     * Etichetta asse X del grafico vacanza.
  
     * Esempio:
  
     * lun 3
     * mar 4
     */
    function formatChartDay(
        timestamp
    ) {
        return new Date(
            timestamp
        ).toLocaleDateString(
            'it-IT',
            {
                weekday:
                    'short',

                day:
                    'numeric',

                timeZone:
                    VACATION_TIMEZONE
            }
        )
    }

    // ==========================================================================
    // CARICAMENTO INIZIALE
    // ==========================================================================

    useEffect(() => {
        if (
            !vacationResolved ||
            !vacation
        ) {
            return
        }

        async function load() {
            // -----------------------------------------------------------------------
            // LOG + PICCHI
            // -----------------------------------------------------------------------

            const loadedLogs =
                await loadVacationLogs()

            const loadedPeaks =
                await loadVacationPeaks()

            // -----------------------------------------------------------------------
            // DRINKS
            // -----------------------------------------------------------------------

            const {
                data: drinksData
            } =
                await supabase
                    .from(
                        TABLES.drinks
                    )
                    .select('*')

            // -----------------------------------------------------------------------
            // USERS
            // -----------------------------------------------------------------------

            const {
                data: usersData
            } =
                await supabase
                    .from(
                        vacation.tables.users
                    )
                    .select('*')
                    .order(
                        'id',
                        {
                            ascending: true
                        }
                    )

            const safeDrinks =
                drinksData || []

            const safeUsers =
                usersData || []

            // -----------------------------------------------------------------------
            // DATI BASE
            // -----------------------------------------------------------------------

            setLogs(
                loadedLogs
            )

            setPeaks(
                loadedPeaks
            )

            setDrinks(
                safeDrinks
            )

            setUsers(
                safeUsers
            )

            /*
             * Se esistono utenti,
             * selezioniamo automaticamente il primo
             * per il grafico a torta.
             */
            if (
                safeUsers.length >
                0
            ) {
                setSelectedPieUserId(
                    safeUsers[0].id
                )
            }

            // -----------------------------------------------------------------------
            // CLASSIFICA GRAMMI
            // -----------------------------------------------------------------------

            const alcoholRanking =
                computeAlcoholRanking(
                    loadedLogs,
                    safeDrinks,
                    safeUsers
                )

            setRankingAlcohol(
                alcoholRanking
            )

            /*
             * La classifica relativa usa come base
             * quella dei grammi.
             */
            setRankingRelative(
                computeRelativeRanking(
                    alcoholRanking
                )
            )

            // -----------------------------------------------------------------------
            // ALTRE STATISTICHE
            // -----------------------------------------------------------------------

            setCounters(
                computeCounters(
                    loadedLogs,
                    safeDrinks
                )
            )

            setRankingPeak(
                computeVacationPeakRanking(
                    loadedPeaks,
                    safeUsers
                )
            )

            setJudgmentDayAward(
                computeJudgmentDayAward(
                    loadedLogs,
                    safeDrinks
                )
            )

            setConsistencyAward(
                computeConsistencyAward(
                    loadedLogs,
                    safeDrinks,
                    safeUsers
                )
            )

            setBestDayAward(
                computeBestSingleDayAward(
                    loadedLogs,
                    safeDrinks,
                    safeUsers
                )
            )
        }
        load()

    }, [
        vacationResolved,
        vacation
    ])

    // ==========================================================================
    // CLASSIFICA ATTIVA
    // ==========================================================================

    const activeRanking =
        activeTab ===
            'alcohol'
            ? rankingAlcohol
            : activeTab ===
                'relative'
                ? rankingRelative
                : rankingPeak

    const podium =
        useMemo(
            () =>
                activeRanking.slice(
                    0,
                    3
                ),
            [
                activeRanking
            ]
        )

    const lastPlace =
        useMemo(
            () => {
                if (
                    activeRanking.length ===
                    0
                ) {
                    return null
                }

                return activeRanking[
                    activeRanking.length -
                    1
                ]
            },
            [
                activeRanking
            ]
        )

    // ==========================================================================
    // COLORI UTENTI
    // ==========================================================================

    const userColorMap =
        useMemo(
            () => {
                const result = {}

                users.forEach(
                    (
                        user,
                        index
                    ) => {
                        result[
                            user.id
                        ] =
                            USER_COLORS[
                            index %
                            USER_COLORS.length
                            ]
                    }
                )

                return result
            },
            [
                users
            ]
        )

    // ==========================================================================
    // GRAFICO VACANZA - GRAMMI CUMULATIVI PER GIORNO
    // ==========================================================================

    /*
     * Per la pagina Vacanza NON creiamo un punto per ogni singolo drink.
  
     * Su una settimana diventerebbe troppo denso.
  
     * Creiamo invece un punto per ogni giornata 08:00 -> 08:00.
  
     * Ogni punto mostra quanti grammi COMPLESSIVI
     * aveva raggiunto ogni partecipante alla fine di quella giornata.
  
     * Esempio:
  
     * Giorno 1
     * Ciccio 120
     * Stack 100
  
     * Giorno 2
     * Ciccio 260
     * Stack 280
  
     * Il grafico racconta quindi l'evoluzione
     * della classifica nel corso della vacanza.
     */
    const vacationChartData =
        useMemo(
            () => {
                if (
                    logs.length === 0 ||
                    users.length === 0
                ) {
                    return []
                }

                /*
                 * Prima raggruppiamo i grammi
                 * per giornata e utente.
                 */
                const dailyMap = {}

                for (const log of logs) {
                    const drink =
                        drinks.find(
                            (d) =>
                                String(
                                    d.id
                                ) ===
                                String(
                                    log.drink_id
                                )
                        )

                    if (!drink) {
                        continue
                    }

                    const dayStart =
                        getAlcoholDayStart(
                            log.created_at
                        )

                    const dayKey =
                        dayStart.toISOString()

                    if (
                        !dailyMap[
                        dayKey
                        ]
                    ) {
                        dailyMap[
                            dayKey
                        ] = {
                            timestamp:
                                dayStart.getTime(),

                            users: {}
                        }
                    }

                    if (
                        !dailyMap[
                            dayKey
                        ].users[
                        log.user_id
                        ]
                    ) {
                        dailyMap[
                            dayKey
                        ].users[
                            log.user_id
                        ] = 0
                    }

                    dailyMap[
                        dayKey
                    ].users[
                        log.user_id
                    ] +=
                        gramsOfAlcohol(
                            drink
                        )
                }

                /*
                 * Ordiniamo le giornate.
                 */
                const days =
                    Object
                        .values(
                            dailyMap
                        )
                        .sort(
                            (a, b) =>
                                a.timestamp -
                                b.timestamp
                        )

                /*
                 * Totale cumulativo corrente.
                 */
                const cumulative = {}

                users.forEach(
                    (user) => {
                        cumulative[
                            user.id
                        ] = 0
                    }
                )

                const result = []

                /*
                 * Per ogni giornata sommiamo i grammi del giorno
                 * al totale precedente.
                 */
                for (
                    const day of
                    days
                ) {
                    const point = {
                        time:
                            day.timestamp
                    }

                    users.forEach(
                        (user) => {
                            cumulative[
                                user.id
                            ] +=
                                day.users[
                                user.id
                                ] || 0

                            point[
                                `user_${user.id}`
                            ] =
                                cumulative[
                                user.id
                                ]
                        }
                    )

                    result.push(
                        point
                    )
                }

                return result
            },
            [
                logs,
                drinks,
                users
            ]
        )

    // ==========================================================================
    // SCALA Y GRAFICO VACANZA
    // ==========================================================================

    /*
     * Come nella pagina Gruppo,
     * adattiamo automaticamente l'asse Y.
  
     * Qui usiamo multipli di 100 grammi,
     * perché i valori complessivi della vacanza
     * saranno molto più grandi.
     */
    const vacationChartYMax =
        useMemo(
            () => {
                const maxGrams =
                    rankingAlcohol.reduce(
                        (
                            max,
                            entry
                        ) =>
                            Math.max(
                                max,
                                entry.totalGrams
                            ),
                        0
                    )

                if (
                    maxGrams <= 0
                ) {
                    return 100
                }

                return Math.max(
                    100,
                    Math.ceil(
                        maxGrams /
                        100
                    ) * 100
                )
            },
            [
                rankingAlcohol
            ]
        )

    // ==========================================================================
    // TOOLTIP GRAFICO VACANZA
    // ==========================================================================

    function VacationTooltip({
        active,
        payload,
        label
    }) {
        if (
            !active ||
            !payload ||
            payload.length ===
            0
        ) {
            return null
        }

        const sortedPayload = [
            ...payload
        ].sort(
            (a, b) =>
                Number(
                    b.value
                ) -
                Number(
                    a.value
                )
        )

        return (
            <div
                className={
                    styles.chartTooltip
                }
            >
                <div
                    className={
                        styles.chartTooltipTime
                    }
                >
                    {formatChartDay(
                        label
                    )}
                </div>

                {sortedPayload.map(
                    (item) => (
                        <div
                            key={
                                item.dataKey
                            }
                            className={
                                styles.chartTooltipRow
                            }
                        >
                            <div
                                className={
                                    styles.chartTooltipUser
                                }
                            >
                                <span
                                    className={
                                        styles.chartTooltipDot
                                    }
                                    style={{
                                        background:
                                            item.color
                                    }}
                                />

                                {
                                    item.name
                                }
                            </div>

                            <strong>
                                {Math.round(
                                    Number(
                                        item.value
                                    )
                                )}{' '}
                                g
                            </strong>
                        </div>
                    )
                )}
            </div>
        )
    }

    // ==========================================================================
    // GRAFICO TORTA - DATI UTENTE
    // ==========================================================================

    /*
     * Conta quante bevute di ogni categoria
     * ha registrato l'utente selezionato.
  
     * Il grafico rappresenta quindi NUMERO DI BEVUTE,
     * non grammi.
     */
    const selectedPieData =
        useMemo(
            () => {
                if (
                    selectedPieUserId ==
                    null
                ) {
                    return []
                }

                const counts = {
                    beer: 0,
                    cocktail: 0,
                    shot: 0
                }

                for (const log of logs) {
                    if (
                        String(
                            log.user_id
                        ) !==
                        String(
                            selectedPieUserId
                        )
                    ) {
                        continue
                    }

                    const drink =
                        drinks.find(
                            (d) =>
                                String(
                                    d.id
                                ) ===
                                String(
                                    log.drink_id
                                )
                        )

                    if (!drink) {
                        continue
                    }

                    if (
                        counts[
                        drink.category
                        ] !== undefined
                    ) {
                        counts[
                            drink.category
                        ]++
                    }
                }

                return [
                    {
                        key:
                            'beer',

                        name:
                            'Birra',

                        value:
                            counts.beer,

                        color:
                            DRINK_CATEGORY_COLORS.beer
                    },

                    {
                        key:
                            'cocktail',

                        name:
                            'Drink',

                        value:
                            counts.cocktail,

                        color:
                            DRINK_CATEGORY_COLORS.cocktail
                    },

                    {
                        key:
                            'shot',

                        name:
                            'Shot',

                        value:
                            counts.shot,

                        color:
                            DRINK_CATEGORY_COLORS.shot
                    }
                ].filter(
                    (entry) =>
                        entry.value > 0
                )
            },
            [
                logs,
                drinks,
                selectedPieUserId
            ]
        )

    const selectedPieUser =
        useMemo(
            () =>
                users.find(
                    (user) =>
                        String(
                            user.id
                        ) ===
                        String(
                            selectedPieUserId
                        )
                ) || null,
            [
                users,
                selectedPieUserId
            ]
        )

    const selectedPieTotal =
        useMemo(
            () =>
                selectedPieData.reduce(
                    (
                        total,
                        entry
                    ) =>
                        total +
                        entry.value,
                    0
                ),
            [
                selectedPieData
            ]
        )


    // ==========================================================================
    // REGISTRO COMPLETO DELLE BEVUTE
    // ==========================================================================

    /*
     * Questa sezione permette di ricostruire le bevute registrate
     * durante la vacanza.
     *
     * È pensata soprattutto per poter controllare dati apparentemente strani:
     *
     * - "Quanti drink aveva segnato?"
     * - "A che ora li aveva registrati?"
     * - "Quante bevute aveva fatto quella giornata?"
     *
     * Sono disponibili due filtri indipendenti:
     *
     * - utente
     * - giornata
     *
     * I filtri possono essere combinati.
     */


    // ==========================================================================
    // GIORNO 08:00 -> 08:00 NEL FUSO DELLA VACANZA
    // ==========================================================================

    /*
     * Restituisce una chiave nel formato:
     *
     *     2026-08-02
     *
     * IMPORTANTE:
     * la giornata viene calcolata nel timezone della vacanza.
     *
     * Prima delle 08:00 la bevuta viene assegnata
     * alla giornata precedente.
     *
     * Esempio:
     *
     *     3 agosto ore 02:00
     *
     * appartiene alla giornata:
     *
     *     2 agosto
     */
    function getVacationDayKey(timestamp) {
        const date =
            new Date(timestamp)

        /*
         * Recuperiamo anno, mese, giorno e ora
         * direttamente nel timezone della vacanza.
         */
        const formatter =
            new Intl.DateTimeFormat(
                'en-CA',
                {
                    timeZone:
                        VACATION_TIMEZONE,

                    year:
                        'numeric',

                    month:
                        '2-digit',

                    day:
                        '2-digit',

                    hour:
                        '2-digit',

                    hourCycle:
                        'h23'
                }
            )

        const parts =
            formatter.formatToParts(
                date
            )

        const values = {}

        for (const part of parts) {
            if (
                part.type !==
                'literal'
            ) {
                values[
                    part.type
                ] = part.value
            }
        }

        let year =
            Number(values.year)

        let month =
            Number(values.month)

        let day =
            Number(values.day)

        const hour =
            Number(values.hour)

        /*
         * Prima delle 08:00 apparteniamo
         * ancora alla giornata precedente.
         */
        if (hour < 8) {
            const previousDay =
                new Date(
                    Date.UTC(
                        year,
                        month - 1,
                        day - 1
                    )
                )

            year =
                previousDay.getUTCFullYear()

            month =
                previousDay.getUTCMonth() +
                1

            day =
                previousDay.getUTCDate()
        }

        /*
         * YYYY-MM-DD
         */
        return [
            year,
            String(month).padStart(
                2,
                '0'
            ),
            String(day).padStart(
                2,
                '0'
            )
        ].join('-')
    }


    // ==========================================================================
    // GIORNI DISPONIBILI NEL MENU
    // ==========================================================================

    /*
     * Mostriamo SOLO le giornate nelle quali
     * è stata registrata almeno una bevuta.
     *
     * Non generiamo quindi artificialmente tutti
     * i giorni compresi tra inizio e fine vacanza.
     */
    const availableHistoryDays =
        useMemo(
            () => {
                const uniqueDays =
                    new Set()

                for (const log of logs) {
                    uniqueDays.add(
                        getVacationDayKey(
                            log.created_at
                        )
                    )
                }

                /*
                 * Ordine cronologico.
                 */
                return Array
                    .from(uniqueDays)
                    .sort()
            },
            [
                logs
            ]
        )


    // ==========================================================================
    // ETICHETTA GIORNO DEL MENU
    // ==========================================================================

    /*
     * Converte:
     *
     *     2026-08-02
     *
     * in:
     *
     *     domenica 2 agosto
     */
    function formatHistoryDay(
        dayKey
    ) {
        if (!dayKey) {
            return ''
        }

        /*
         * Usiamo mezzogiorno UTC per evitare che
         * eventuali conversioni di timezone spostino
         * la data al giorno precedente.
         */
        const date =
            new Date(
                `${dayKey}T12:00:00Z`
            )

        return date.toLocaleDateString(
            'it-IT',
            {
                weekday:
                    'long',

                day:
                    'numeric',

                month:
                    'long',

                timeZone:
                    'UTC'
            }
        )
    }


    // ==========================================================================
    // ORARIO DELLE SINGOLE BEVUTE
    // ==========================================================================

    function formatHistoryTime(
        timestamp
    ) {
        return new Date(
            timestamp
        ).toLocaleTimeString(
            'it-IT',
            {
                hour:
                    '2-digit',

                minute:
                    '2-digit',

                timeZone:
                    VACATION_TIMEZONE
            }
        )
    }


    // ==========================================================================
    // DATA + ORARIO QUANDO SONO VISUALIZZATI TUTTI I GIORNI
    // ==========================================================================

    function formatHistoryDateTime(
        timestamp
    ) {
        return new Date(
            timestamp
        ).toLocaleString(
            'it-IT',
            {
                weekday:
                    'short',

                day:
                    'numeric',

                hour:
                    '2-digit',

                minute:
                    '2-digit',

                timeZone:
                    VACATION_TIMEZONE
            }
        )
    }


    // ==========================================================================
    // APPLICAZIONE DEI FILTRI
    // ==========================================================================

    const filteredHistoryLogs =
        useMemo(
            () => {
                let result =
                    [...logs]

                /*
                 * FILTRO UTENTE
                 */
                if (
                    historyUserId !==
                    'all'
                ) {
                    result =
                        result.filter(
                            (log) =>
                                String(
                                    log.user_id
                                ) ===
                                String(
                                    historyUserId
                                )
                        )
                }

                /*
                 * FILTRO GIORNATA
                 */
                if (
                    historyDay !==
                    'all'
                ) {
                    result =
                        result.filter(
                            (log) =>
                                getVacationDayKey(
                                    log.created_at
                                ) ===
                                historyDay
                        )
                }

                /*
                 * Più recente in alto.
                 */
                return result.sort(
                    (a, b) =>
                        new Date(
                            b.created_at
                        ).getTime() -
                        new Date(
                            a.created_at
                        ).getTime()
                )
            },
            [
                logs,
                historyUserId,
                historyDay
            ]
        )


    // ==========================================================================
    // RENDER CLASSIFICA
    // ==========================================================================

    function getRankingValue(
        entry
    ) {
        if (
            activeTab ===
            'alcohol'
        ) {
            return `${Math.round(
                entry.totalGrams
            )} g`
        }

        if (
            activeTab ===
            'relative'
        ) {
            return `${entry.gramsPerKg.toFixed(
                2
            )} g/kg`
        }

        return entry.peakBac.toFixed(
            2
        )
    }

    function getRankingSecondary(
        entry
    ) {
        if (
            activeTab ===
            'relative'
        ) {
            return `${Math.round(
                entry.totalGrams
            )} g · ${entry.weight} kg`
        }

        if (
            activeTab ===
            'peak'
        ) {
            return `Picco ${formatTime(
                entry.peakTime
            )}`
        }

        return null
    }

    function renderRankingEntry(
        entry,
        medal
    ) {
        if (!entry) {
            return null
        }

        const secondary =
            getRankingSecondary(
                entry
            )

        return (
            <div
                className={
                    styles.rankingRow
                }
            >
                <div
                    className={
                        styles.rankingIdentity
                    }
                >
                    <span
                        className={
                            styles.medal
                        }
                    >
                        {medal}
                    </span>

                    <div>
                        <div
                            className={
                                styles.rankingName
                            }
                        >
                            {entry.name}
                        </div>

                        {secondary && (
                            <div
                                className={
                                    styles.rankingSecondary
                                }
                            >
                                {secondary}
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className={
                        styles.rankingValue
                    }
                >
                    {getRankingValue(
                        entry
                    )}
                </div>
            </div>
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
                            RIEPILOGO VACANZA
                        </div>

                        <h1
                            className={
                                styles.title
                            }
                        >
                            {VACANZA_TITLE}
                        </h1>
                    </div>

                    <button
                        className={
                            styles.homeButton
                        }
                        onClick={() =>
                            router.push(
                                '/vacanze'
                            )
                        }
                        aria-label="Torna alle vecchie vacanze"
                    >
                        ←
                    </button>
                </header>

                {/* ================================================================
            CONTATORI TOTALI
            ================================================================ */}

                <section
                    className={
                        styles.counterCard
                    }
                >
                    <div
                        className={
                            styles.counterItem
                        }
                    >
                        <span
                            className={
                                styles.counterEmoji
                            }
                        >
                            🍺
                        </span>

                        <div>
                            <strong>
                                {
                                    counters.beer
                                }
                            </strong>

                            <span>
                                Birre
                            </span>
                        </div>
                    </div>

                    <div
                        className={
                            styles.counterDivider
                        }
                    />

                    <div
                        className={
                            styles.counterItem
                        }
                    >
                        <span
                            className={
                                styles.counterEmoji
                            }
                        >
                            🍹
                        </span>

                        <div>
                            <strong>
                                {
                                    counters.cocktail
                                }
                            </strong>

                            <span>
                                Drink
                            </span>
                        </div>
                    </div>

                    <div
                        className={
                            styles.counterDivider
                        }
                    />

                    <div
                        className={
                            styles.counterItem
                        }
                    >
                        <span
                            className={
                                styles.counterEmoji
                            }
                        >
                            🥃
                        </span>

                        <div>
                            <strong>
                                {
                                    counters.shot
                                }
                            </strong>

                            <span>
                                Shot
                            </span>
                        </div>
                    </div>
                </section>

                {/* ================================================================
            PREMI
            ================================================================ */}

                <section
                    className={
                        styles.section
                    }
                >
                    <div
                        className={
                            styles.sectionHeader
                        }
                    >
                        <div>
                            <div
                                className={
                                    styles.eyebrow
                                }
                            >
                                PREMI VACANZA
                            </div>

                            <h2
                                className={
                                    styles.sectionTitle
                                }
                            >
                                Hall of fame
                            </h2>
                        </div>
                    </div>

                    <div
                        className={
                            styles.awardsGrid
                        }
                    >
                        {judgmentDayAward && (
                            <div
                                className={
                                    styles.awardCard
                                }
                            >
                                <span
                                    className={
                                        styles.awardEmoji
                                    }
                                >
                                    ⚖️
                                </span>

                                <div
                                    className={
                                        styles.awardLabel
                                    }
                                >
                                    Giorno del giudizio
                                </div>

                                <strong
                                    className={
                                        styles.awardValue
                                    }
                                >
                                    {Math.round(
                                        judgmentDayAward.totalGrams
                                    )}{' '}
                                    g
                                </strong>

                                <div
                                    className={
                                        styles.awardSecondary
                                    }
                                >
                                    {formatAwardDay(
                                        judgmentDayAward.dayStart
                                    )}
                                </div>
                            </div>
                        )}

                        {consistencyAward && (
                            <div
                                className={
                                    styles.awardCard
                                }
                            >
                                <span
                                    className={
                                        styles.awardEmoji
                                    }
                                >
                                    🔁
                                </span>

                                <div
                                    className={
                                        styles.awardLabel
                                    }
                                >
                                    Instancabile
                                </div>

                                <strong
                                    className={
                                        styles.awardName
                                    }
                                >
                                    {
                                        consistencyAward.name
                                    }
                                </strong>

                                <div
                                    className={
                                        styles.awardSecondary
                                    }
                                >
                                    {
                                        consistencyAward.daysAboveThreshold
                                    }{' '}
                                    giorni sopra 90 g
                                </div>
                            </div>
                        )}

                        {bestDayAward && (
                            <div
                                className={
                                    styles.awardCard
                                }
                            >
                                <span
                                    className={
                                        styles.awardEmoji
                                    }
                                >
                                    🌟
                                </span>

                                <div
                                    className={
                                        styles.awardLabel
                                    }
                                >
                                    24 ore di fama
                                </div>

                                <strong
                                    className={
                                        styles.awardName
                                    }
                                >
                                    {
                                        bestDayAward.name
                                    }
                                </strong>

                                <div
                                    className={
                                        styles.awardValueSmall
                                    }
                                >
                                    {Math.round(
                                        bestDayAward.totalGrams
                                    )}{' '}
                                    g
                                </div>

                                <div
                                    className={
                                        styles.awardSecondary
                                    }
                                >
                                    {formatAwardDay(
                                        bestDayAward.dayStart
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ================================================================
            CLASSIFICHE
            ================================================================ */}

                <section
                    className={
                        styles.section
                    }
                >
                    <div
                        className={
                            styles.sectionHeader
                        }
                    >
                        <div>
                            <div
                                className={
                                    styles.eyebrow
                                }
                            >
                                COMPETIZIONE
                            </div>

                            <h2
                                className={
                                    styles.sectionTitle
                                }
                            >
                                Classifica
                            </h2>
                        </div>
                    </div>

                    {/* --------------------------------------------------------------
              3 TAB
              -------------------------------------------------------------- */}

                    <div
                        className={
                            styles.segmentedControl
                        }
                    >
                        <button
                            className={
                                activeTab ===
                                    'alcohol'
                                    ? styles.segmentActive
                                    : ''
                            }
                            onClick={() => {
                                setActiveTab(
                                    'alcohol'
                                )

                                setShowFullRanking(
                                    false
                                )
                            }}
                        >
                            Grammi
                        </button>

                        <button
                            className={
                                activeTab ===
                                    'relative'
                                    ? styles.segmentActive
                                    : ''
                            }
                            onClick={() => {
                                setActiveTab(
                                    'relative'
                                )

                                setShowFullRanking(
                                    false
                                )
                            }}
                        >
                            g / kg
                        </button>

                        <button
                            className={
                                activeTab ===
                                    'peak'
                                    ? styles.segmentActive
                                    : ''
                            }
                            onClick={() => {
                                setActiveTab(
                                    'peak'
                                )

                                setShowFullRanking(
                                    false
                                )
                            }}
                        >
                            Picco BAC
                        </button>
                    </div>

                    {/* --------------------------------------------------------------
              PODIO
              -------------------------------------------------------------- */}

                    <div
                        className={
                            styles.rankingCard
                        }
                    >
                        {renderRankingEntry(
                            podium[0],
                            '🥇'
                        )}

                        {renderRankingEntry(
                            podium[1],
                            '🥈'
                        )}

                        {renderRankingEntry(
                            podium[2],
                            '🥉'
                        )}
                    </div>

                    {/* --------------------------------------------------------------
              IL DISPIACERE
              -------------------------------------------------------------- */}

                    {lastPlace && (
                        <div
                            className={
                                styles.lastPlaceCard
                            }
                        >
                            <div>
                                <div
                                    className={
                                        styles.lastPlaceLabel
                                    }
                                >
                                    IL DISPIACERE
                                </div>

                                <strong>
                                    {
                                        lastPlace.name
                                    }
                                </strong>
                            </div>

                            <div
                                className={
                                    styles.lastPlaceValue
                                }
                            >
                                {getRankingValue(
                                    lastPlace
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        className={
                            styles.secondaryButton
                        }
                        onClick={() =>
                            setShowFullRanking(
                                (prev) =>
                                    !prev
                            )
                        }
                    >
                        {showFullRanking
                            ? 'Nascondi classifica completa'
                            : 'Vedi classifica completa'}
                    </button>

                    {/* --------------------------------------------------------------
              CLASSIFICA COMPLETA
              -------------------------------------------------------------- */}

                    {showFullRanking && (
                        <div
                            className={
                                styles.fullRanking
                            }
                        >
                            {activeRanking.map(
                                (
                                    entry,
                                    index
                                ) => {
                                    const secondary =
                                        getRankingSecondary(
                                            entry
                                        )

                                    return (
                                        <div
                                            key={
                                                entry.userId
                                            }
                                            className={
                                                styles.fullRankingRow
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.fullRankingLeft
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles.rankNumber
                                                    }
                                                >
                                                    {index +
                                                        1}
                                                </span>

                                                <div>
                                                    <strong>
                                                        {
                                                            entry.name
                                                        }
                                                    </strong>

                                                    {secondary && (
                                                        <div
                                                            className={
                                                                styles.rankingSecondary
                                                            }
                                                        >
                                                            {
                                                                secondary
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <strong
                                                className={
                                                    styles.fullRankingValue
                                                }
                                            >
                                                {getRankingValue(
                                                    entry
                                                )}
                                            </strong>
                                        </div>
                                    )
                                }
                            )}
                        </div>
                    )}
                </section>

                {/* ================================================================
            GRAFICO ANDAMENTO VACANZA
            ================================================================ */}

                <section
                    className={
                        styles.section
                    }
                >
                    <div
                        className={
                            styles.sectionHeader
                        }
                    >
                        <div>
                            <div
                                className={
                                    styles.eyebrow
                                }
                            >
                                ANDAMENTO
                            </div>

                            <h2
                                className={
                                    styles.sectionTitle
                                }
                            >
                                La gara della vacanza
                            </h2>
                        </div>
                    </div>

                    <div
                        className={
                            styles.chartCard
                        }
                    >
                        {vacationChartData.length >
                            0 ? (
                            <>
                                <div
                                    className={
                                        styles.chartWrapper
                                    }
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <LineChart
                                            data={
                                                vacationChartData
                                            }
                                            margin={{
                                                top: 12,
                                                right: 8,
                                                bottom: 6,
                                                left: -8
                                            }}
                                        >
                                            <CartesianGrid
                                                stroke="#1d1d20"
                                                strokeDasharray="3 3"
                                                vertical={
                                                    false
                                                }
                                            />

                                            <XAxis
                                                dataKey="time"
                                                tickFormatter={
                                                    formatChartDay
                                                }
                                                tick={{
                                                    fill:
                                                        '#8e8e93',
                                                    fontSize: 11
                                                }}
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                                minTickGap={
                                                    20
                                                }
                                            />

                                            <YAxis
                                                domain={[
                                                    0,
                                                    vacationChartYMax
                                                ]}
                                                tickFormatter={(
                                                    value
                                                ) =>
                                                    `${Math.round(
                                                        value
                                                    )}g`
                                                }
                                                tick={{
                                                    fill:
                                                        '#8e8e93',
                                                    fontSize: 11
                                                }}
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                                width={
                                                    54
                                                }
                                            />

                                            <Tooltip
                                                content={
                                                    <VacationTooltip />
                                                }
                                            />

                                            {users.map(
                                                (user) => (
                                                    <Line
                                                        key={
                                                            user.id
                                                        }
                                                        type="monotone"
                                                        dataKey={`user_${user.id}`}
                                                        name={
                                                            user.nickname
                                                        }
                                                        stroke={
                                                            userColorMap[
                                                            user.id
                                                            ]
                                                        }
                                                        strokeWidth={
                                                            2.4
                                                        }
                                                        dot={{
                                                            r: 3
                                                        }}
                                                        activeDot={{
                                                            r: 5
                                                        }}
                                                        isAnimationActive={
                                                            false
                                                        }
                                                    />
                                                )
                                            )}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div
                                    className={
                                        styles.chartLegend
                                    }
                                >
                                    {users.map(
                                        (user) => (
                                            <div
                                                key={
                                                    user.id
                                                }
                                                className={
                                                    styles.chartLegendItem
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles.chartLegendDot
                                                    }
                                                    style={{
                                                        background:
                                                            userColorMap[
                                                            user.id
                                                            ]
                                                    }}
                                                />

                                                {
                                                    user.nickname
                                                }
                                            </div>
                                        )
                                    )}
                                </div>
                            </>
                        ) : (
                            <div
                                className={
                                    styles.emptyState
                                }
                            >
                                Il grafico comparirà quando saranno presenti dati della vacanza.
                            </div>
                        )}
                    </div>
                </section>

                {/* ================================================================
            DISTRIBUZIONE BEVANDE
            ================================================================ */}

                <section
                    className={
                        styles.section
                    }
                >
                    <div
                        className={
                            styles.sectionHeader
                        }
                    >
                        <div>
                            <div
                                className={
                                    styles.eyebrow
                                }
                            >
                                PREFERENZE
                            </div>

                            <h2
                                className={
                                    styles.sectionTitle
                                }
                            >
                                Cosa ha bevuto?
                            </h2>
                        </div>
                    </div>

                    {/* --------------------------------------------------------------
              SELETTORE UTENTE
              -------------------------------------------------------------- */}

                    <div
                        className={
                            styles.filterScroller
                        }
                    >
                        {users.map(
                            (user) => (
                                <button
                                    key={
                                        user.id
                                    }
                                    className={`${styles.filterChip} ${String(
                                        selectedPieUserId
                                    ) ===
                                        String(
                                            user.id
                                        )
                                        ? styles.filterChipActive
                                        : ''
                                        }`}
                                    onClick={() =>
                                        setSelectedPieUserId(
                                            user.id
                                        )
                                    }
                                >
                                    {
                                        user.nickname
                                    }
                                </button>
                            )
                        )}
                    </div>

                    <div
                        className={
                            styles.pieCard
                        }
                    >
                        {selectedPieData.length >
                            0 ? (
                            <>
                                <div
                                    className={
                                        styles.pieTitle
                                    }
                                >
                                    {
                                        selectedPieUser?.nickname
                                    }
                                </div>

                                <div
                                    className={
                                        styles.pieChartWrapper
                                    }
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <PieChart>
                                            <Pie
                                                data={
                                                    selectedPieData
                                                }
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={
                                                    68
                                                }
                                                outerRadius={
                                                    102
                                                }
                                                paddingAngle={
                                                    3
                                                }
                                                stroke="none"
                                            >
                                                {selectedPieData.map(
                                                    (
                                                        entry
                                                    ) => (
                                                        <Cell
                                                            key={
                                                                entry.key
                                                            }
                                                            fill={
                                                                entry.color
                                                            }
                                                        />
                                                    )
                                                )}
                                            </Pie>

                                            <Tooltip
                                                formatter={(
                                                    value,
                                                    name
                                                ) => [
                                                        `${value} bevute`,
                                                        name
                                                    ]}
                                                contentStyle={{
                                                    background:
                                                        '#121214',
                                                    border:
                                                        '1px solid #343438',
                                                    borderRadius:
                                                        '12px',
                                                    color:
                                                        '#f5f5f7'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    {/* --------------------------------------------------------
                      NUMERO TOTALE AL CENTRO
                      -------------------------------------------------------- */}

                                    <div
                                        className={
                                            styles.pieCenter
                                        }
                                    >
                                        <strong>
                                            {
                                                selectedPieTotal
                                            }
                                        </strong>

                                        <span>
                                            bevute
                                        </span>
                                    </div>
                                </div>

                                {/* ----------------------------------------------------------
                    LEGENDA TORTA
                    ---------------------------------------------------------- */}

                                <div
                                    className={
                                        styles.pieLegend
                                    }
                                >
                                    {selectedPieData.map(
                                        (entry) => {
                                            const percentage =
                                                selectedPieTotal >
                                                    0
                                                    ? (
                                                        entry.value /
                                                        selectedPieTotal
                                                    ) *
                                                    100
                                                    : 0

                                            return (
                                                <div
                                                    key={
                                                        entry.key
                                                    }
                                                    className={
                                                        styles.pieLegendRow
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.pieLegendName
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.pieLegendDot
                                                            }
                                                            style={{
                                                                background:
                                                                    entry.color
                                                            }}
                                                        />

                                                        {
                                                            entry.name
                                                        }
                                                    </div>

                                                    <div
                                                        className={
                                                            styles.pieLegendValue
                                                        }
                                                    >
                                                        {
                                                            entry.value
                                                        }{' '}
                                                        <span>
                                                            (
                                                            {Math.round(
                                                                percentage
                                                            )}
                                                            %)
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    )}
                                </div>
                            </>
                        ) : (
                            <div
                                className={
                                    styles.emptyState
                                }
                            >
                                Nessuna bevuta registrata per questo utente.
                            </div>
                        )}
                    </div>
                </section>
                {/* ================================================================
    REGISTRO COMPLETO DELLE BEVUTE
    ================================================================ */}

                <section
                    className={
                        styles.section
                    }
                >
                    <div
                        className={
                            styles.sectionHeader
                        }
                    >
                        <div>
                            <div
                                className={
                                    styles.eyebrow
                                }
                            >
                                REGISTRO
                            </div>

                            <h2
                                className={
                                    styles.sectionTitle
                                }
                            >
                                Storico bevute
                            </h2>
                        </div>

                        {/* Numero di bevute attualmente visualizzate */}
                        <div
                            className={
                                styles.historyCount
                            }
                        >
                            {
                                filteredHistoryLogs.length
                            }
                        </div>
                    </div>


                    {/* ==============================================================
      FILTRI
      ============================================================== */}

                    <div
                        className={
                            styles.historyFilters
                        }
                    >
                        {/* --------------------------------------------------------------
        FILTRO UTENTE
        -------------------------------------------------------------- */}

                        <div
                            className={
                                styles.historyFilterGroup
                            }
                        >
                            <label
                                className={
                                    styles.historyFilterLabel
                                }
                            >
                                Utente
                            </label>

                            <select
                                className={
                                    styles.historySelect
                                }
                                value={
                                    historyUserId
                                }
                                onChange={(e) =>
                                    setHistoryUserId(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="all">
                                    Tutti
                                </option>

                                {users.map(
                                    (user) => (
                                        <option
                                            key={
                                                user.id
                                            }
                                            value={
                                                user.id
                                            }
                                        >
                                            {
                                                user.nickname
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>


                        {/* --------------------------------------------------------------
        FILTRO GIORNO
        -------------------------------------------------------------- */}

                        <div
                            className={
                                styles.historyFilterGroup
                            }
                        >
                            <label
                                className={
                                    styles.historyFilterLabel
                                }
                            >
                                Giorno
                            </label>

                            <select
                                className={
                                    styles.historySelect
                                }
                                value={
                                    historyDay
                                }
                                onChange={(e) =>
                                    setHistoryDay(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="all">
                                    Tutti i giorni
                                </option>

                                {availableHistoryDays.map(
                                    (dayKey) => (
                                        <option
                                            key={
                                                dayKey
                                            }
                                            value={
                                                dayKey
                                            }
                                        >
                                            {formatHistoryDay(
                                                dayKey
                                            )}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>


                    {/* ==============================================================
      LISTA BEVUTE
      ============================================================== */}

                    <div
                        className={
                            styles.historyList
                        }
                    >
                        {filteredHistoryLogs.length >
                            0 ? (
                            filteredHistoryLogs.map(
                                (log) => {
                                    /*
                                     * Recuperiamo il drink.
                                     */
                                    const drink =
                                        drinks.find(
                                            (d) =>
                                                String(
                                                    d.id
                                                ) ===
                                                String(
                                                    log.drink_id
                                                )
                                        )

                                    /*
                                     * Recuperiamo l'utente.
                                     */
                                    const logUser =
                                        users.find(
                                            (user) =>
                                                String(
                                                    user.id
                                                ) ===
                                                String(
                                                    log.user_id
                                                )
                                        )
                                    // ==========================================================================
                                    // VACANZA NON TROVATA
                                    // ==========================================================================

                                    /*
                                     * Protezione nel caso qualcuno scriva manualmente
                                     * un URL inesistente, per esempio:
                                     *
                                     * /vacanze/paperopoli_2037
                                     */
                                    if (!vacation) {
                                        return (
                                            <main className={styles.page}>
                                                <div className={styles.container}>
                                                    <div className={styles.emptyState}>
                                                        Vacanza non trovata.

                                                        <br />
                                                        <br />

                                                        <button
                                                            className={styles.secondaryButton}
                                                            onClick={() =>
                                                                router.push('/vacanze')
                                                            }
                                                        >
                                                            ← Torna alle vecchie vacanze
                                                        </button>
                                                    </div>
                                                </div>
                                            </main>
                                        )
                                    }
                                    return (
                                        <div
                                            key={
                                                log.id
                                            }
                                            className={
                                                styles.historyRow
                                            }
                                        >
                                            {/* ----------------------------------------------------
                  DRINK + UTENTE
                  ---------------------------------------------------- */}

                                            <div
                                                className={
                                                    styles.historyLeft
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.historyEmoji
                                                    }
                                                >
                                                    {
                                                        drink?.emoji
                                                    }
                                                </div>

                                                <div
                                                    className={
                                                        styles.historyText
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.historyDrink
                                                        }
                                                    >
                                                        {
                                                            drink?.name ||
                                                            'Bevuta'
                                                        }
                                                    </div>

                                                    <div
                                                        className={
                                                            styles.historyUser
                                                        }
                                                    >
                                                        {
                                                            logUser?.nickname ||
                                                            'Utente'
                                                        }
                                                    </div>
                                                </div>
                                            </div>


                                            {/* ----------------------------------------------------
                  DATA / ORARIO
                  ---------------------------------------------------- */}

                                            <div
                                                className={
                                                    styles.historyTime
                                                }
                                            >
                                                {historyDay ===
                                                    'all'
                                                    ? formatHistoryDateTime(
                                                        log.created_at
                                                    )
                                                    : formatHistoryTime(
                                                        log.created_at
                                                    )}
                                            </div>
                                        </div>
                                    )
                                }
                            )
                        ) : (
                            <div
                                className={
                                    styles.emptyState
                                }
                            >
                                Nessuna bevuta corrisponde ai filtri selezionati.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}