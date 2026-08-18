'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'

import { supabase } from '../../lib/supabase'
import {
    TABLES,
    getVacationTables
} from '../../lib/tableNames'
import styles from './group.module.css'

/*
===============================================================================
PAGINA GRUPPO - V2
===============================================================================

Questa pagina rappresenta il riepilogo della GIORNATA corrente del gruppo.

La "giornata" dell'app NON coincide con il giorno solare.

La giornata va:

    dalle 08:00
    alle 08:00 del giorno successivo

Esempio:

    10 agosto ore 23:00 -> giornata del 10 agosto
    11 agosto ore 03:00 -> ancora giornata del 10 agosto
    11 agosto ore 09:00 -> giornata dell'11 agosto


OBIETTIVI DELLA V2
-------------------------------------------------------------------------------

1. Mantenere centrale la competizione sui grammi di alcol.

2. Mantenere la classifica Picco BAC.

3. Eliminare il premio "Missile", perché dipende troppo
   dalla precisione temporale con cui vengono inserite le bevute.

4. Mantenere:
   - Re della birra
   - Macchina da cocktail

5. Aggiungere un grafico dell'andamento giornaliero:
   - asse X = tempo
   - asse Y = grammi cumulativi
   - una linea per utente

6. Aggiungere lo storico completo delle bevute della giornata.

7. Permettere di filtrare lo storico per singolo utente.

8. Uniformare graficamente la pagina allo stile della Home V2:
   - sfondo nero
   - card quasi nere
   - bordi sottili
   - tipografia pulita
   - colori usati con moderazione


IMPORTANTE
-------------------------------------------------------------------------------

Il grafico utilizza l'ORARIO DI INSERIMENTO della bevuta.

Se un utente registra a posteriori più bevute insieme,
il grafico mostrerà inevitabilmente un salto in quel momento.

Per questo il grafico ha SOLO valore visivo/competitivo.

NON viene utilizzato per:
- premi
- calcoli BAC
- statistiche sull'intensità oraria

===============================================================================
*/

export default function GroupPage() {
    const router = useRouter()

    const [sessionTables, setSessionTables] = useState(null)
    const [sessionResolved, setSessionResolved] = useState(false)
    const [vacationTitle, setVacationTitle] = useState('')

    // ==========================================================================
    // STATO DELLA PAGINA
    // ==========================================================================

    /*
     * Etichetta della giornata.
     *
     * Esempio:
     *
     * DOMENICA 2
     */
    const [dayLabel, setDayLabel] = useState('')

    /*
     * Tab attualmente visualizzata:
     *
     * alcohol -> grammi di alcol
     * peak    -> Picco BAC
     */
    const [activeTab, setActiveTab] = useState('alcohol')

    /*
     * Decide se mostrare la classifica completa
     * oppure solamente:
     *
     * - podio
     * - "Il dispiacere"
     */
    const [showFullRanking, setShowFullRanking] = useState(false)

    /*
     * Filtro utilizzato nello storico delle bevute.
     *
     * 'all' -> tutti gli utenti
     * id    -> singolo utente
     */
    const [selectedUserId, setSelectedUserId] = useState('all')

    /*
     * Dati caricati da Supabase.
     *
     * Li manteniamo nello state perché vengono utilizzati
     * da più sezioni della pagina:
     *
     * - classifiche
     * - grafico
     * - premi
     * - storico
     */
    const [logs, setLogs] = useState([])
    const [drinks, setDrinks] = useState([])
    const [users, setUsers] = useState([])
    const [peaks, setPeaks] = useState([])

    /*
     * Contatori globali della giornata.
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
    const [rankingPeak, setRankingPeak] = useState([])

    /*
     * Premi giornalieri rimasti nella V2.
     */
    const [beerAward, setBeerAward] = useState(null)
    const [cocktailAward, setCocktailAward] = useState(null)

    // ==========================================================================
    // COLORI UTENTI DEL GRAFICO
    // ==========================================================================

    /*
     * Palette ispirata ai colori di sistema Apple.
     *
     * Ogni utente riceve un colore stabile in base
     * alla sua posizione nella lista utenti.
     *
     * Con 8 partecipanti abbiamo 8 colori distinti.
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

    // ==========================================================================
    // GESTIONE GIORNATA 08:00 -> 08:00
    // ==========================================================================

    /*
     * Restituisce:
     *
     * start -> inizio giornata
     * end   -> fine giornata
     */
    function getDayBounds(now = new Date()) {
        const current = new Date(now)

        const start = new Date(current)

        start.setHours(
            8,
            0,
            0,
            0
        )

        /*
         * Se sono prima delle 08:00,
         * appartengo ancora alla giornata precedente.
         */
        if (current.getHours() < 8) {
            start.setDate(
                start.getDate() - 1
            )
        }

        const end = new Date(start)

        end.setDate(
            end.getDate() + 1
        )

        return {
            start,
            end
        }
    }

    /*
     * Restituisce solamente l'inizio della giornata.
     *
     * Serve per cercare il record corretto
     * nella tabella daily_bac_peaks.
     */
    function getDayStart(now = new Date()) {
        const current = new Date(now)

        const start = new Date(current)

        start.setHours(
            8,
            0,
            0,
            0
        )

        if (current.getHours() < 8) {
            start.setDate(
                start.getDate() - 1
            )
        }

        return start
    }

    /*
     * Costruisce l'etichetta leggibile della giornata.
     */
    function getDayLabel(now = new Date()) {
        const current = new Date(now)

        const day = new Date(current)

        day.setHours(
            8,
            0,
            0,
            0
        )

        if (current.getHours() < 8) {
            day.setDate(
                day.getDate() - 1
            )
        }

        const giorni = [
            'domenica',
            'lunedì',
            'martedì',
            'mercoledì',
            'giovedì',
            'venerdì',
            'sabato'
        ]

        const giornoSettimana =
            giorni[day.getDay()]

        const numero =
            day.getDate()

        return `${giornoSettimana.toUpperCase()} ${numero}`
    }

    // ==========================================================================
    // GRAMMI DI ALCOL
    // ==========================================================================

    /*
     * Grammi di etanolo contenuti in una bevanda.
     *
     * Formula:
     *
     * volume ml
     * × gradazione
     * × densità etanolo
     */
    function gramsOfAlcohol(drink) {
        return (
            Number(drink.volume_ml) *
            (Number(drink.perc_alc) / 100) *
            0.789
        )
    }

    // ==========================================================================
    // CARICAMENTO LOG DELLA GIORNATA
    // ==========================================================================

    /*
     * Recuperiamo i log in ordine CRONOLOGICO crescente.
     *
     * Questo è particolarmente utile per costruire il grafico.
     */
    async function loadTodayLogs(tables = sessionTables) {
        if (!tables) {
            return []
        }

        const {
            start,
            end
        } = getDayBounds()

        const { data } =
            await supabase
                .from(tables.drinkLogs)
                .select('*')
                .gte(
                    'created_at',
                    start.toISOString()
                )
                .lt(
                    'created_at',
                    end.toISOString()
                )
                .order(
                    'created_at',
                    {
                        ascending: true
                    }
                )

        return data || []
    }

    // ==========================================================================
    // CONTATORI
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
    // CLASSIFICA GRAMMI
    // ==========================================================================

    function computeAlcoholRanking(
        logs,
        drinks,
        users
    ) {
        const userMap = {}

        /*
         * Creiamo una voce per ogni utente,
         * anche se non ha ancora bevuto.
         */
        for (const user of users) {
            userMap[user.id] = {
                userId: user.id,
                name: user.nickname,
                weight:
                    Number(user.peso_kg),

                totalGrams: 0,

                counts: {
                    beer: 0,
                    cocktail: 0,
                    shot: 0
                }
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
                userMap[log.user_id]

            if (!entry) continue

            entry.totalGrams +=
                gramsOfAlcohol(drink)

            if (
                drink.category ===
                'beer'
            ) {
                entry.counts.beer++
            }

            if (
                drink.category ===
                'cocktail'
            ) {
                entry.counts.cocktail++
            }

            if (
                drink.category ===
                'shot'
            ) {
                entry.counts.shot++
            }
        }

        /*
         * Ordinamento:
         *
         * 1. più grammi
         * 2. in caso di parità, utente più leggero
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
    // CLASSIFICA PICCO BAC
    // ==========================================================================

    function computePeakRanking(
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
                    Number(user.peso_kg),

                peakBac: 0,
                peakTime: null
            }
        }

        for (const peak of peaks) {
            if (
                !userMap[
                peak.user_id
                ]
            ) {
                continue
            }

            userMap[
                peak.user_id
            ] = {
                ...userMap[
                peak.user_id
                ],

                peakBac:
                    Number(
                        peak.peak_bac
                    ),

                peakTime:
                    peak.peak_time
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
    // RE DELLA BIRRA
    // ==========================================================================

    /*
     * Vince chi ha bevuto più ml totali di birra.
     */
    function computeBeerAward(
        logs,
        drinks,
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
                    Number(user.peso_kg),

                totalBeerMl: 0
            }
        }

        for (const log of logs) {
            const drink =
                drinks.find(
                    (d) =>
                        String(d.id) ===
                        String(log.drink_id)
                )

            if (
                !drink ||
                drink.category !==
                'beer'
            ) {
                continue
            }

            const entry =
                userMap[
                log.user_id
                ]

            if (!entry) continue

            entry.totalBeerMl +=
                Number(
                    drink.volume_ml
                )
        }

        return Object
            .values(userMap)
            .sort(
                (a, b) => {
                    if (
                        b.totalBeerMl !==
                        a.totalBeerMl
                    ) {
                        return (
                            b.totalBeerMl -
                            a.totalBeerMl
                        )
                    }

                    return (
                        a.weight -
                        b.weight
                    )
                }
            )[0] || null
    }

    // ==========================================================================
    // MACCHINA DA COCKTAIL
    // ==========================================================================

    function computeCocktailAward(
        logs,
        drinks,
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
                    Number(user.peso_kg),

                cocktailCount: 0
            }
        }

        for (const log of logs) {
            const drink =
                drinks.find(
                    (d) =>
                        String(d.id) ===
                        String(log.drink_id)
                )

            if (
                !drink ||
                drink.category !==
                'cocktail'
            ) {
                continue
            }

            const entry =
                userMap[
                log.user_id
                ]

            if (!entry) continue

            entry.cocktailCount++
        }

        return Object
            .values(userMap)
            .sort(
                (a, b) => {
                    if (
                        b.cocktailCount !==
                        a.cocktailCount
                    ) {
                        return (
                            b.cocktailCount -
                            a.cocktailCount
                        )
                    }

                    return (
                        a.weight -
                        b.weight
                    )
                }
            )[0] || null
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
        ).toLocaleTimeString(
            'it-IT',
            {
                hour:
                    '2-digit',

                minute:
                    '2-digit'
            }
        )
    }

    /*
     * Versione usata dall'asse X del grafico.
     *
     * Il valore ricevuto è un timestamp numerico.
     */
    function formatChartTime(
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
                    '2-digit'
            }
        )
    }

    function formatLiters(
        ml
    ) {
        return `${(
            ml / 1000
        ).toFixed(1)} L`
    }

    // ==========================================================================
    // CARICAMENTO INIZIALE
    // ==========================================================================

    // ==========================================================================
    // RISOLUZIONE SESSIONE ATTIVA
    // ==========================================================================

    useEffect(() => {
        let cancelled = false

        async function resolveActiveSession() {
            const {
                data: config,
                error
            } =
                await supabase
                    .from(TABLES.appConfig)
                    .select('text_value')
                    .eq(
                        'key',
                        'active_vacation_slug'
                    )
                    .maybeSingle()

            if (cancelled) return

            const slug =
                config?.text_value
                    ?.trim()

            if (
                error ||
                !slug
            ) {
                if (error) {
                    console.error(
                        'Errore lettura sessione attiva:',
                        error
                    )
                }

                setSessionTables(null)
                setSessionResolved(true)

                router.replace('/standby')

                return
            }

            const tables =
                getVacationTables(slug)

            setSessionTables(tables)

            const {
                data: vacation
            } =
                await supabase
                    .from('vacations')
                    .select('title')
                    .eq(
                        'slug',
                        slug
                    )
                    .maybeSingle()

            if (cancelled) return

            setVacationTitle(
                vacation?.title ||
                slug
            )

            setSessionResolved(true)
        }

        resolveActiveSession()

        return () => {
            cancelled = true
        }
    }, [router])


    // ==========================================================================
    // CARICAMENTO DATI SESSIONE
    // ==========================================================================

    useEffect(() => {
        if (
            !sessionResolved ||
            !sessionTables
        ) {
            return
        }

        async function load() {
            setDayLabel(
                getDayLabel()
            )

            // LOG

            const loadedLogs =
                await loadTodayLogs(
                    sessionTables
                )

            // DRINK

            const {
                data: drinksData
            } =
                await supabase
                    .from(TABLES.drinks)
                    .select('*')

            // UTENTI DELLA SESSIONE ATTIVA

            const {
                data: usersData
            } =
                await supabase
                    .from(
                        sessionTables.users
                    )
                    .select('*')
                    .order(
                        'id',
                        {
                            ascending: true
                        }
                    )

            // PICCHI DELLA SESSIONE ATTIVA

            const dayStart =
                getDayStart()
                    .toISOString()

            const {
                data: peaksData
            } =
                await supabase
                    .from(
                        sessionTables.dailyBacPeaks
                    )
                    .select('*')
                    .eq(
                        'day_start',
                        dayStart
                    )

            const safeDrinks =
                drinksData || []

            const safeUsers =
                usersData || []

            const safePeaks =
                peaksData || []

            setLogs(
                loadedLogs
            )

            setDrinks(
                safeDrinks
            )

            setUsers(
                safeUsers
            )

            setPeaks(
                safePeaks
            )

            setCounters(
                computeCounters(
                    loadedLogs,
                    safeDrinks
                )
            )

            setRankingAlcohol(
                computeAlcoholRanking(
                    loadedLogs,
                    safeDrinks,
                    safeUsers
                )
            )

            setRankingPeak(
                computePeakRanking(
                    safePeaks,
                    safeUsers
                )
            )

            setBeerAward(
                computeBeerAward(
                    loadedLogs,
                    safeDrinks,
                    safeUsers
                )
            )

            setCocktailAward(
                computeCocktailAward(
                    loadedLogs,
                    safeDrinks,
                    safeUsers
                )
            )
        }

        load()

    }, [
        sessionResolved,
        sessionTables
    ])

    // ==========================================================================
    // CLASSIFICA ATTIVA
    // ==========================================================================

    const activeRanking =
        activeTab ===
            'alcohol'
            ? rankingAlcohol
            : rankingPeak

    /*
     * Prime tre posizioni.
     */
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

    /*
     * Ultimo classificato.
     */
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
    // MAPPA UTENTE -> COLORE
    // ==========================================================================

    /*
     * Costruiamo una mappa del tipo:
     *
     * {
     *   1: '#0A84FF',
     *   2: '#30D158',
     *   ...
     * }
     *
     * In questo modo ogni utente mantiene sempre
     * lo stesso colore all'interno del grafico.
     */
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
    // COSTRUZIONE DATI GRAFICO
    // ==========================================================================

    /*
     * Il grafico mostra i GRAMMI CUMULATIVI.
     *
     * Esempio semplificato:
     *
     * 20:00 Ciccio beve 20 g
     *
     * Ciccio = 20
     * Stack  = 0
     *
     *
     * 20:30 Stack beve 20 g
     *
     * Ciccio = 20
     * Stack  = 20
     *
     *
     * 21:00 Ciccio beve altri 20 g
     *
     * Ciccio = 40
     * Stack  = 20
     *
     *
     * Ad ogni nuovo log creiamo quindi un punto
     * contenente il totale aggiornato di TUTTI gli utenti.
     */
    const chartData =
        useMemo(
            () => {
                if (
                    logs.length === 0 ||
                    users.length === 0
                ) {
                    return []
                }

                /*
                 * Totale corrente per ogni utente.
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
                 * Punto iniziale.
                 *
                 * Usiamo l'orario della prima bevuta
                 * con tutti gli utenti ancora a zero.
                 */
                const firstTime =
                    new Date(
                        logs[0].created_at
                    ).getTime()

                const startPoint = {
                    time:
                        firstTime
                }

                users.forEach(
                    (user) => {
                        startPoint[
                            `user_${user.id}`
                        ] = 0
                    }
                )

                result.push(
                    startPoint
                )

                /*
                 * I log sono già ordinati cronologicamente.
                 */
                for (
                    const log of logs
                ) {
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

                    /*
                     * Aggiorniamo il totale dell'utente
                     * che ha registrato questa bevuta.
                     */
                    if (
                        cumulative[
                        log.user_id
                        ] !== undefined
                    ) {
                        cumulative[
                            log.user_id
                        ] +=
                            gramsOfAlcohol(
                                drink
                            )
                    }

                    /*
                     * Creiamo una fotografia completa della classifica
                     * in questo preciso istante.
                     */
                    const point = {
                        time:
                            new Date(
                                log.created_at
                            ).getTime()
                    }

                    users.forEach(
                        (user) => {
                            point[
                                `user_${user.id}`
                            ] =
                                cumulative[
                                user.id
                                ] || 0
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
    // SCALA ASSE X
    // ==========================================================================

    /*
     * Non vogliamo visualizzare automaticamente tutte
     * le 24 ore 08:00 -> 08:00.
     *
     * Se la prima bevuta è alle 18:00,
     * mostrare dieci ore vuote prima sarebbe inutile.
     *
     * Aggiungiamo quindi 30 minuti di margine
     * prima della prima bevuta e dopo l'ultima.
     */
    const chartXDomain =
        useMemo(
            () => {
                if (
                    chartData.length ===
                    0
                ) {
                    return [
                        0,
                        1
                    ]
                }

                const times =
                    chartData.map(
                        (point) =>
                            point.time
                    )

                const min =
                    Math.min(
                        ...times
                    )

                const max =
                    Math.max(
                        ...times
                    )

                const THIRTY_MINUTES =
                    30 *
                    60 *
                    1000

                /*
                 * Se c'è una sola bevuta,
                 * allarghiamo comunque il grafico.
                 */
                if (
                    min === max
                ) {
                    return [
                        min -
                        THIRTY_MINUTES,
                        max +
                        THIRTY_MINUTES
                    ]
                }

                return [
                    min -
                    THIRTY_MINUTES,
                    max +
                    THIRTY_MINUTES
                ]
            },
            [
                chartData
            ]
        )


    // ==========================================================================
    // TACche ORARIE ASSE X
    // ==========================================================================

    /*
     * Genera le etichette dell'asse X a intervalli di un'ora.
     *
     * Non utilizziamo gli orari delle singole bevute come etichette,
     * perché quando ci sono molti drink ravvicinati finirebbero
     * inevitabilmente per sovrapporsi.
     *
     * Esempio:
     *
     *   15:00   16:00   17:00   18:00
     *
     * Le bevute continuano comunque a essere posizionate
     * nel loro orario preciso.
     */
    const chartXTicks = useMemo(() => {
        if (chartData.length === 0) {
            return []
        }

        const [min, max] = chartXDomain

        /*
         * Partiamo dalla prima ora intera successiva
         * all'inizio del grafico.
         */
        const firstTick = new Date(min)

        firstTick.setMinutes(0, 0, 0)

        if (firstTick.getTime() < min) {
            firstTick.setHours(
                firstTick.getHours() + 1
            )
        }

        const ticks = []

        let current =
            firstTick.getTime()

        const ONE_HOUR =
            60 * 60 * 1000

        /*
         * Aggiungiamo una tacca ogni ora
         * finché restiamo nel dominio del grafico.
         */
        while (current <= max) {
            ticks.push(current)

            current += ONE_HOUR
        }

        return ticks
    }, [chartData, chartXDomain])

    // ==========================================================================
    // SCALA ASSE Y
    // ==========================================================================

    /*
     * L'asse Y si adatta automaticamente
     * alla giornata corrente.
     *
     * Arrotondiamo verso l'alto al multiplo di 25 g.
     *
     * Esempio:
     *
     * leader = 137 g
     *
     * asse Y = 150 g
     *
     *
     * Impostiamo comunque un minimo di 50 g
     * per evitare un grafico troppo "zoomato"
     * nelle primissime fasi della giornata.
     */
    const chartYMax =
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
                    return 50
                }

                return Math.max(
                    50,
                    Math.ceil(
                        maxGrams /
                        25
                    ) * 25
                )
            },
            [
                rankingAlcohol
            ]
        )

    // ==========================================================================
    // TOOLTIP DEL GRAFICO
    // ==========================================================================

    /*
     * Tooltip personalizzato mostrato quando si tocca
     * o si passa sopra un punto del grafico.
     */
    function ChartTooltip({
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

        /*
         * Ordiniamo gli utenti dal valore più alto
         * al più basso nel punto temporale selezionato.
         */
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
                    {formatChartTime(
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
    // STORICO FILTRATO
    // ==========================================================================

    /*
     * Nella query i log sono in ordine crescente,
     * perché servono così al grafico.
     *
     * Nello storico vogliamo invece:
     *
     * bevuta più recente -> in alto.
     */
    const filteredLogs =
        useMemo(
            () => {
                let result = [
                    ...logs
                ]

                if (
                    selectedUserId !==
                    'all'
                ) {
                    result =
                        result.filter(
                            (log) =>
                                String(
                                    log.user_id
                                ) ===
                                String(
                                    selectedUserId
                                )
                        )
                }

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
                selectedUserId
            ]
        )

    // ==========================================================================
    // COMPONENTI DI SUPPORTO
    // ==========================================================================

    /*
     * Mostra i conteggi delle categorie sotto
     * una voce della classifica grammi.
     */
    function renderCounts(
        counts
    ) {
        return (
            <div
                className={
                    styles.entryCounts
                }
            >
                {counts.beer >
                    0 && (
                        <span>
                            🍺{' '}
                            {counts.beer}
                        </span>
                    )}

                {counts.cocktail >
                    0 && (
                        <span>
                            🍹{' '}
                            {
                                counts.cocktail
                            }
                        </span>
                    )}

                {counts.shot >
                    0 && (
                        <span>
                            🥃{' '}
                            {counts.shot}
                        </span>
                    )}
            </div>
        )
    }

    /*
     * Singola riga del podio grammi.
     */
    function renderAlcoholEntry(
        entry,
        medal
    ) {
        if (!entry) {
            return null
        }

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

                        {renderCounts(
                            entry.counts
                        )}
                    </div>
                </div>

                <div
                    className={
                        styles.rankingValue
                    }
                >
                    {Math.round(
                        entry.totalGrams
                    )}{' '}
                    g
                </div>
            </div>
        )
    }

    /*
     * Singola riga del podio Picco BAC.
     */
    function renderPeakEntry(
        entry,
        medal
    ) {
        if (!entry) {
            return null
        }

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

                        <div
                            className={
                                styles.rankingSecondary
                            }
                        >
                            Picco alle{' '}
                            {formatTime(
                                entry.peakTime
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className={
                        styles.rankingValue
                    }
                >
                    {entry.peakBac.toFixed(
                        2
                    )}
                </div>
            </div>
        )
    }

    // ==========================================================================
    // INTERFACCIA
    // ==========================================================================
    if (
        !sessionResolved ||
        !sessionTables
    ) {
        return null
    }
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
                            RIEPILOGO GIORNALIERO
                        </div>

                        <h1
                            className={
                                styles.title
                            }
                        >
                            Gruppo
                        </h1>

                        <div
                            className={
                                styles.dayLabel
                            }
                        >
                            {dayLabel}
                        </div>
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
            CONTATORI GIORNALIERI
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
            CLASSIFICA
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
              SEGMENTED CONTROL
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
                            Alcol
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
                        {activeTab ===
                            'alcohol' ? (
                            <>
                                {renderAlcoholEntry(
                                    podium[0],
                                    '🥇'
                                )}

                                {renderAlcoholEntry(
                                    podium[1],
                                    '🥈'
                                )}

                                {renderAlcoholEntry(
                                    podium[2],
                                    '🥉'
                                )}
                            </>
                        ) : (
                            <>
                                {renderPeakEntry(
                                    podium[0],
                                    '🥇'
                                )}

                                {renderPeakEntry(
                                    podium[1],
                                    '🥈'
                                )}

                                {renderPeakEntry(
                                    podium[2],
                                    '🥉'
                                )}
                            </>
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
                                {activeTab ===
                                    'alcohol'
                                    ? `${Math.round(
                                        lastPlace.totalGrams
                                    )} g`
                                    : lastPlace.peakBac.toFixed(
                                        2
                                    )}
                            </div>
                        </div>
                    )}

                    {/* --------------------------------------------------------------
              CLASSIFICA COMPLETA
              -------------------------------------------------------------- */}

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
                                ) => (
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

                                                {activeTab ===
                                                    'alcohol' &&
                                                    renderCounts(
                                                        entry.counts
                                                    )}

                                                {activeTab ===
                                                    'peak' && (
                                                        <div
                                                            className={
                                                                styles.rankingSecondary
                                                            }
                                                        >
                                                            Picco alle{' '}
                                                            {formatTime(
                                                                entry.peakTime
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>

                                        <strong
                                            className={
                                                styles.fullRankingValue
                                            }
                                        >
                                            {activeTab ===
                                                'alcohol'
                                                ? `${Math.round(
                                                    entry.totalGrams
                                                )} g`
                                                : entry.peakBac.toFixed(
                                                    2
                                                )}
                                        </strong>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </section>

                {/* ================================================================
            GRAFICO
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
                                La gara di oggi
                            </h2>
                        </div>
                    </div>

                    <div
                        className={
                            styles.chartCard
                        }
                    >
                        {chartData.length >
                            1 ? (
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
                                                chartData
                                            }
                                            margin={{
                                                top: 12,
                                                right: 8,
                                                bottom: 4,
                                                left: -12
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
                                                type="number"
                                                dataKey="time"
                                                domain={chartXDomain}
                                                scale="time"

                                                /*
                                                 * Mostriamo solamente le ore intere generate
                                                 * da chartXTicks.
                                                 */
                                                ticks={chartXTicks}

                                                tickFormatter={formatChartTime}

                                                tick={{
                                                    fill: '#8e8e93',
                                                    fontSize: 11
                                                }}

                                                axisLine={false}
                                                tickLine={false}

                                                /*
                                                 * Forziamo Recharts a mostrare le tacche che abbiamo scelto.
                                                 */
                                                interval={0}
                                            />

                                            <YAxis
                                                domain={[
                                                    0,
                                                    chartYMax
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
                                                    48
                                                }
                                            />

                                            <Tooltip
                                                content={
                                                    <ChartTooltip />
                                                }
                                                cursor={{
                                                    stroke:
                                                        '#48484a',
                                                    strokeWidth:
                                                        1
                                                }}
                                            />

                                            {users.map(
                                                (user) => (
                                                    <Line
                                                        key={user.id}

                                                        /*
                                                         * "monotone" crea una linea curva e morbida
                                                         * tra i vari punti.
                                                         *
                                                         * È lo stesso stile utilizzato nel grafico
                                                         * complessivo della pagina Vacanza.
                                                         */
                                                        type="monotone"

                                                        dataKey={`user_${user.id}`}
                                                        name={user.nickname}

                                                        stroke={userColorMap[user.id]}

                                                        /*
                                                         * Linea leggermente più spessa
                                                         * per migliorarne la leggibilità.
                                                         */
                                                        strokeWidth={1.8}
                                                        strokeOpacity={0.85}

                                                        /*
                                                         * Mostriamo un piccolo punto in corrispondenza
                                                         * di ogni variazione del totale.
                                                         *
                                                         * Questo permette di capire dove è stata
                                                         * effettivamente registrata una nuova bevuta.
                                                         */
                                                        dot={false}

                                                        /*
                                                         * Quando si passa sopra / si tocca il punto
                                                         * diventa più grande.
                                                         */
                                                        activeDot={{
                                                            r: 5
                                                        }}

                                                        /*
                                                         * Evitiamo animazioni al caricamento.
                                                         */
                                                        isAnimationActive={false}
                                                    />
                                                )
                                            )}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* ----------------------------------------------------------
                    LEGENDA UTENTI
                    ---------------------------------------------------------- */}

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
                                Il grafico comparirà dopo le prime bevute della giornata.
                            </div>
                        )}
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
                                PREMI GIORNALIERI
                            </div>

                            <h2
                                className={
                                    styles.sectionTitle
                                }
                            >
                                Premi
                            </h2>
                        </div>
                    </div>

                    <div
                        className={
                            styles.awardsGrid
                        }
                    >
                        {beerAward && (
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
                                    🍺
                                </span>

                                <div
                                    className={
                                        styles.awardLabel
                                    }
                                >
                                    Re della birra
                                </div>

                                <strong
                                    className={
                                        styles.awardName
                                    }
                                >
                                    {
                                        beerAward.name
                                    }
                                </strong>

                                <div
                                    className={
                                        styles.awardValue
                                    }
                                >
                                    {formatLiters(
                                        beerAward.totalBeerMl
                                    )}
                                </div>
                            </div>
                        )}

                        {cocktailAward && (
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
                                    🍹
                                </span>

                                <div
                                    className={
                                        styles.awardLabel
                                    }
                                >
                                    Macchina da cocktail
                                </div>

                                <strong
                                    className={
                                        styles.awardName
                                    }
                                >
                                    {
                                        cocktailAward.name
                                    }
                                </strong>

                                <div
                                    className={
                                        styles.awardValue
                                    }
                                >
                                    {
                                        cocktailAward.cocktailCount
                                    }{' '}
                                    cocktail
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ================================================================
            STORICO BEVUTE
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
                                CRONOLOGIA
                            </div>

                            <h2
                                className={
                                    styles.sectionTitle
                                }
                            >
                                Bevute di oggi
                            </h2>
                        </div>

                        <div
                            className={
                                styles.logCount
                            }
                        >
                            {
                                filteredLogs.length
                            }
                        </div>
                    </div>

                    {/* --------------------------------------------------------------
              FILTRO UTENTE
              -------------------------------------------------------------- */}

                    <div
                        className={
                            styles.filterScroller
                        }
                    >
                        <button
                            className={`${styles.filterChip} ${selectedUserId ===
                                'all'
                                ? styles.filterChipActive
                                : ''
                                }`}
                            onClick={() =>
                                setSelectedUserId(
                                    'all'
                                )
                            }
                        >
                            Tutti
                        </button>

                        {users.map(
                            (user) => (
                                <button
                                    key={
                                        user.id
                                    }
                                    className={`${styles.filterChip} ${String(
                                        selectedUserId
                                    ) ===
                                        String(
                                            user.id
                                        )
                                        ? styles.filterChipActive
                                        : ''
                                        }`}
                                    onClick={() =>
                                        setSelectedUserId(
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

                    {/* --------------------------------------------------------------
              LISTA BEVUTE
              -------------------------------------------------------------- */}

                    <div
                        className={
                            styles.logsList
                        }
                    >
                        {filteredLogs.length >
                            0 ? (
                            filteredLogs.map(
                                (log) => {
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

                                    return (
                                        <div
                                            key={
                                                log.id
                                            }
                                            className={
                                                styles.logRow
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.logLeft
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.logEmoji
                                                    }
                                                >
                                                    {
                                                        drink?.emoji
                                                    }
                                                </div>

                                                <div>
                                                    <div
                                                        className={
                                                            styles.logDrinkName
                                                        }
                                                    >
                                                        {
                                                            drink?.name
                                                        }
                                                    </div>

                                                    <div
                                                        className={
                                                            styles.logUserName
                                                        }
                                                    >
                                                        {
                                                            logUser?.nickname ||
                                                            'Utente'
                                                        }
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className={
                                                    styles.logTime
                                                }
                                            >
                                                {formatTime(
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
                                Nessuna bevuta da mostrare.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}