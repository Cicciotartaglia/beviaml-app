'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import styles from '../styles/form.module.css'

export default function VacanzaPage() {
    const router = useRouter()

    const [activeTab, setActiveTab] = useState('alcohol')
    const [showFullRanking, setShowFullRanking] = useState(false)

    const [counters, setCounters] = useState({
        beer: 0,
        cocktail: 0,
        shot: 0
    })

    const [rankingAlcohol, setRankingAlcohol] = useState([])
    const [rankingPeak, setRankingPeak] = useState([])
    const [judgmentDayAward, setJudgmentDayAward] = useState(null)
    const [consistencyAward, setConsistencyAward] = useState(null)
    const [bestDayAward, setBestDayAward] = useState(null)

    /*
    ============================================================
    CAMBIA QUI IL TITOLO DELLA VACANZA
    ============================================================
    */
    const VACANZA_TITLE = 'CRETA 2026'

    /*
    ============================================================
    CAMBIA QUI L'INIZIO DELLA VACANZA
    La fine viene presa automaticamente come "adesso"
    Formato consigliato: YYYY-MM-DDTHH:mm:ss
    ============================================================
    */
    const VACANZA_START = '2026-03-09T12:00:00'

    async function loadVacationLogs() {
        const vacationNow = new Date().toISOString()

        const { data } = await supabase
            .from('drink_logs')
            .select('*')
            .gte('created_at', new Date(VACANZA_START).toISOString())
            .lte('created_at', vacationNow)

        return data || []
    }

    async function loadVacationPeaks() {
        const vacationNow = new Date().toISOString()

        const { data } = await supabase
            .from('daily_bac_peaks')
            .select('*')
            .gte('peak_time', new Date(VACANZA_START).toISOString())
            .lte('peak_time', vacationNow)

        return data || []
    }

    function computeCounters(logs, drinks) {
        const result = {
            beer: 0,
            cocktail: 0,
            shot: 0
        }

        for (const log of logs) {
            const drink = drinks.find((d) => String(d.id) === String(log.drink_id))
            if (!drink) continue

            if (drink.category === 'beer') result.beer++
            if (drink.category === 'cocktail') result.cocktail++
            if (drink.category === 'shot') result.shot++
        }

        return result
    }

    function computeAlcoholRanking(logs, drinks, users) {
        const userMap = {}

        for (const user of users) {
            userMap[user.id] = {
                userId: user.id,
                name: user.nickname,
                weight: Number(user.peso_kg),
                totalGrams: 0
            }
        }

        for (const log of logs) {
            const drink = drinks.find((d) => String(d.id) === String(log.drink_id))
            if (!drink) continue

            const entry = userMap[log.user_id]
            if (!entry) continue

            const grams = drink.volume_ml * (drink.perc_alc / 100) * 0.789
            entry.totalGrams += grams
        }

        return Object.values(userMap).sort((a, b) => {
            if (b.totalGrams !== a.totalGrams) {
                return b.totalGrams - a.totalGrams
            }

            return a.weight - b.weight
        })
    }

    function computeVacationPeakRanking(peaks, users) {
        const userMap = {}

        for (const user of users) {
            userMap[user.id] = {
                userId: user.id,
                name: user.nickname,
                weight: Number(user.peso_kg),
                peakBac: 0,
                peakTime: null
            }
        }

        for (const peak of peaks) {
            const current = userMap[peak.user_id]
            if (!current) continue

            const bacValue = Number(peak.peak_bac)

            if (bacValue > current.peakBac) {
                userMap[peak.user_id] = {
                    ...current,
                    peakBac: bacValue,
                    peakTime: peak.peak_time
                }
            }
        }

        return Object.values(userMap).sort((a, b) => {
            if (b.peakBac !== a.peakBac) {
                return b.peakBac - a.peakBac
            }

            return a.weight - b.weight
        })
    }

    function computeJudgmentDayAward(logs, drinks) {
        const dailyMap = {}

        for (const log of logs) {
            const logDate = new Date(log.created_at)

            const dayStart = new Date(logDate)
            dayStart.setHours(8, 0, 0, 0)

            if (logDate.getHours() < 8) {
                dayStart.setDate(dayStart.getDate() - 1)
            }

            const key = dayStart.toISOString()

            if (!dailyMap[key]) {
                dailyMap[key] = {
                    dayStart,
                    totalGrams: 0
                }
            }

            const drink = drinks.find((d) => String(d.id) === String(log.drink_id))
            if (!drink) continue

            const grams = drink.volume_ml * (drink.perc_alc / 100) * 0.789
            dailyMap[key].totalGrams += grams
        }

        const allDays = Object.values(dailyMap).sort((a, b) => b.totalGrams - a.totalGrams)

        return allDays[0] || null
    }

    function computeConsistencyAward(logs, drinks, users) {
        const THRESHOLD = 90
        const userDayMap = {}
        const perUserPerDay = {}

        for (const user of users) {
            userDayMap[user.id] = {
                userId: user.id,
                name: user.nickname,
                weight: Number(user.peso_kg),
                daysAboveThreshold: 0,
                totalGrams: 0
            }
        }

        for (const log of logs) {
            const drink = drinks.find((d) => String(d.id) === String(log.drink_id))
            if (!drink) continue

            const entry = userDayMap[log.user_id]
            if (!entry) continue

            const logDate = new Date(log.created_at)

            const dayStart = new Date(logDate)
            dayStart.setHours(8, 0, 0, 0)

            if (logDate.getHours() < 8) {
                dayStart.setDate(dayStart.getDate() - 1)
            }

            const dayKey = dayStart.toISOString()

            if (!perUserPerDay[log.user_id]) {
                perUserPerDay[log.user_id] = {}
            }

            if (!perUserPerDay[log.user_id][dayKey]) {
                perUserPerDay[log.user_id][dayKey] = 0
            }

            const grams = drink.volume_ml * (drink.perc_alc / 100) * 0.789

            perUserPerDay[log.user_id][dayKey] += grams
            entry.totalGrams += grams
        }

        for (const userId in perUserPerDay) {
            for (const dayKey in perUserPerDay[userId]) {
                if (perUserPerDay[userId][dayKey] >= THRESHOLD) {
                    userDayMap[userId].daysAboveThreshold++
                }
            }
        }

        const ranking = Object.values(userDayMap).sort((a, b) => {
            if (b.daysAboveThreshold !== a.daysAboveThreshold) {
                return b.daysAboveThreshold - a.daysAboveThreshold
            }

            if (b.totalGrams !== a.totalGrams) {
                return b.totalGrams - a.totalGrams
            }

            return a.weight - b.weight
        })

        return ranking[0] || null
    }

    function computeBestSingleDayAward(logs, drinks, users) {
        const perUserPerDay = {}

        for (const log of logs) {
            const drink = drinks.find((d) => String(d.id) === String(log.drink_id))
            if (!drink) continue

            const logDate = new Date(log.created_at)

            const dayStart = new Date(logDate)
            dayStart.setHours(8, 0, 0, 0)

            if (logDate.getHours() < 8) {
                dayStart.setDate(dayStart.getDate() - 1)
            }

            const dayKey = dayStart.toISOString()

            if (!perUserPerDay[log.user_id]) {
                perUserPerDay[log.user_id] = {}
            }

            if (!perUserPerDay[log.user_id][dayKey]) {
                perUserPerDay[log.user_id][dayKey] = {
                    totalGrams: 0,
                    dayStart
                }
            }

            const grams = drink.volume_ml * (drink.perc_alc / 100) * 0.789
            perUserPerDay[log.user_id][dayKey].totalGrams += grams
        }

        let best = null

        for (const user of users) {
            const userDays = perUserPerDay[user.id] || {}

            for (const dayKey in userDays) {
                const entry = userDays[dayKey]

                if (!best || entry.totalGrams > best.totalGrams) {
                    best = {
                        userId: user.id,
                        name: user.nickname,
                        totalGrams: entry.totalGrams,
                        dayStart: entry.dayStart
                    }
                }
            }
        }

        return best
    }

    function formatTime(timestamp) {
        if (!timestamp) return '—'

        return new Date(timestamp).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Athens'
        })
    }

    function formatAwardDay(date) {
        if (!date) return ''

        return new Date(date).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'Europe/Athens'
        })
    }

    useEffect(() => {
        async function load() {
            const logs = await loadVacationLogs()
            const peaks = await loadVacationPeaks()

            const { data: drinks } = await supabase
                .from('drinks')
                .select('*')

            const { data: users } = await supabase
                .from('users')
                .select('*')

            const safeDrinks = drinks || []
            const safeUsers = users || []
            const safePeaks = peaks || []

            setCounters(computeCounters(logs, safeDrinks))
            setRankingAlcohol(computeAlcoholRanking(logs, safeDrinks, safeUsers))
            setRankingPeak(computeVacationPeakRanking(safePeaks, safeUsers))
            setJudgmentDayAward(computeJudgmentDayAward(logs, safeDrinks))
            setConsistencyAward(computeConsistencyAward(logs, safeDrinks, safeUsers))
            setBestDayAward(computeBestSingleDayAward(logs, safeDrinks, safeUsers))
        }

        load()
    }, [])

    const activeRanking =
        activeTab === 'alcohol' ? rankingAlcohol : rankingPeak

    const podium = useMemo(() => activeRanking.slice(0, 3), [activeRanking])

    const lastPlace = useMemo(() => {
        if (activeRanking.length === 0) return null
        return activeRanking[activeRanking.length - 1]
    }, [activeRanking])

    function renderAlcoholCard(entry, medal = null) {
        if (!entry) return null

        return (
            <div
                key={`${entry.userId}-${medal || 'entry'}`}
                style={{
                    border: '1px solid #2a2a2a',
                    borderRadius: '14px',
                    padding: '12px',
                    background: '#111',
                    textAlign: 'center'
                }}
            >
                {medal && <div style={{ fontSize: '22px' }}>{medal}</div>}
                <div style={{ fontWeight: 600 }}>{entry.name}</div>
                <div style={{ fontSize: '28px', fontWeight: 700 }}>
                    {Math.round(entry.totalGrams)} g
                </div>
            </div>
        )
    }

    function renderPeakCard(entry, medal = null) {
        if (!entry) return null

        return (
            <div
                key={`${entry.userId}-${medal || 'entry'}`}
                style={{
                    border: '1px solid #2a2a2a',
                    borderRadius: '14px',
                    padding: '12px',
                    background: '#111',
                    textAlign: 'center'
                }}
            >
                {medal && <div style={{ fontSize: '22px' }}>{medal}</div>}
                <div style={{ fontWeight: 600 }}>{entry.name}</div>
                <div style={{ fontSize: '28px', fontWeight: 700 }}>
                    {entry.peakBac.toFixed(2)}
                </div>
                <div style={{ opacity: 0.8 }}>
                    Picco alle {formatTime(entry.peakTime)}
                </div>
            </div>
        )
    }

    return (
        <main className={styles.page}>
            <div
                className={styles.card}
                style={{ maxWidth: '700px', width: '95%', alignItems: 'stretch' }}
            >
                <h1 className={styles.title}>{VACANZA_TITLE}</h1>

                <button
                    className={styles.button}
                    onClick={() => router.push('/home')}
                    style={{ marginBottom: '10px' }}
                >
                    ← Torna alla Home
                </button>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        marginTop: '20px',
                        fontSize: '22px'
                    }}
                >
                    <div style={{ textAlign: 'center' }}>
                        <div>🍺</div>
                        <div>{counters.beer}</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <div>🍹</div>
                        <div>{counters.cocktail}</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <div>🥃</div>
                        <div>{counters.shot}</div>
                    </div>
                </div>

                <div
                    style={{
                        textAlign: 'center',
                        marginTop: '28px',
                        fontSize: '14px',
                        letterSpacing: '0.12em',
                        opacity: 0.7
                    }}
                >
                    PREMI VACANZA
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        marginTop: '12px'
                    }}
                >
                    {judgmentDayAward && (
                        <div
                            style={{
                                border: '1px solid #2a2a2a',
                                borderRadius: '14px',
                                padding: '12px',
                                background: '#111',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '22px' }}>⚖️</div>
                            <div style={{ fontWeight: 600, marginTop: '4px' }}>
                                Giorno del giudizio
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px' }}>
                                {Math.round(judgmentDayAward.totalGrams)} g
                            </div>
                            <div style={{ opacity: 0.8, marginTop: '4px' }}>
                                {formatAwardDay(judgmentDayAward.dayStart)}
                            </div>
                        </div>
                    )}

                    {consistencyAward && (
                        <div
                            style={{
                                border: '1px solid #2a2a2a',
                                borderRadius: '14px',
                                padding: '12px',
                                background: '#111',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '22px' }}>🔁</div>
                            <div style={{ fontWeight: 600, marginTop: '4px' }}>
                                Instancabile
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px' }}>
                                {consistencyAward.name}
                            </div>
                            <div style={{ opacity: 0.8, marginTop: '4px' }}>
                                {consistencyAward.daysAboveThreshold} giorni sopra 90 g
                            </div>
                        </div>
                    )}

                    {bestDayAward && (
                        <div
                            style={{
                                border: '1px solid #2a2a2a',
                                borderRadius: '14px',
                                padding: '12px',
                                background: '#111',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '22px' }}>🌟</div>
                            <div style={{ fontWeight: 600, marginTop: '4px' }}>
                                24 ore di fama
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px' }}>
                                {bestDayAward.name}
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px' }}>
                                {Math.round(bestDayAward.totalGrams)} g
                            </div>
                            <div style={{ opacity: 0.8, marginTop: '4px' }}>
                                {formatAwardDay(bestDayAward.dayStart)}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                        className={styles.button}
                        onClick={() => {
                            setActiveTab('alcohol')
                            setShowFullRanking(false)
                        }}
                        style={{ opacity: activeTab === 'alcohol' ? 1 : 0.6 }}
                    >
                        Alcol
                    </button>

                    <button
                        className={styles.button}
                        onClick={() => {
                            setActiveTab('peak')
                            setShowFullRanking(false)
                        }}
                        style={{ opacity: activeTab === 'peak' ? 1 : 0.6 }}
                    >
                        Picco BAC
                    </button>
                </div>

                {activeTab === 'alcohol' && (
                    <div
                        style={{
                            marginTop: '30px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}
                    >
                        <div style={{ textAlign: 'center', opacity: 0.7 }}>
                            CLASSIFICA VACANZA
                        </div>

                        {podium[0] && renderAlcoholCard(podium[0], '🥇')}
                        {podium[1] && renderAlcoholCard(podium[1], '🥈')}
                        {podium[2] && renderAlcoholCard(podium[2], '🥉')}

                        {lastPlace && (
                            <div
                                style={{
                                    marginTop: '10px',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '14px',
                                    padding: '12px',
                                    background: '#111',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ opacity: 0.7, marginBottom: '6px' }}>
                                    IL DISPIACERE
                                </div>
                                <div>
                                    {lastPlace.name} — {Math.round(lastPlace.totalGrams)} g
                                </div>
                            </div>
                        )}

                        <button
                            className={styles.button}
                            onClick={() => setShowFullRanking((prev) => !prev)}
                            style={{ marginTop: '8px' }}
                        >
                            {showFullRanking
                                ? 'NASCONDI LA CLASSIFICA COMPLETA'
                                : 'VEDI LA CLASSIFICA COMPLETA'}
                        </button>

                        {showFullRanking && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    marginTop: '8px'
                                }}
                            >
                                {rankingAlcohol.map((entry, index) => (
                                    <div
                                        key={entry.userId}
                                        style={{
                                            border: '1px solid #2a2a2a',
                                            borderRadius: '14px',
                                            padding: '12px',
                                            background: '#111'
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div style={{ fontWeight: 600 }}>
                                                {index + 1}. {entry.name}
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 700 }}>
                                                {Math.round(entry.totalGrams)} g
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'peak' && (
                    <div
                        style={{
                            marginTop: '30px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}
                    >
                        <div style={{ textAlign: 'center', opacity: 0.7 }}>
                            PICCO BAC VACANZA
                        </div>

                        {podium[0] && renderPeakCard(podium[0], '🥇')}
                        {podium[1] && renderPeakCard(podium[1], '🥈')}
                        {podium[2] && renderPeakCard(podium[2], '🥉')}

                        {lastPlace && (
                            <div
                                style={{
                                    marginTop: '10px',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '14px',
                                    padding: '12px',
                                    background: '#111',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ opacity: 0.7, marginBottom: '6px' }}>
                                    IL DISPIACERE
                                </div>
                                <div>{lastPlace.name} — {lastPlace.peakBac.toFixed(2)}</div>
                                <div style={{ opacity: 0.8 }}>
                                    Picco alle {formatTime(lastPlace.peakTime)}
                                </div>
                            </div>
                        )}

                        <button
                            className={styles.button}
                            onClick={() => setShowFullRanking((prev) => !prev)}
                            style={{ marginTop: '8px' }}
                        >
                            {showFullRanking
                                ? 'NASCONDI LA CLASSIFICA COMPLETA'
                                : 'VEDI LA CLASSIFICA COMPLETA'}
                        </button>

                        {showFullRanking && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    marginTop: '8px'
                                }}
                            >
                                {rankingPeak.map((entry, index) => (
                                    <div
                                        key={entry.userId}
                                        style={{
                                            border: '1px solid #2a2a2a',
                                            borderRadius: '14px',
                                            padding: '12px',
                                            background: '#111'
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div style={{ fontWeight: 600 }}>
                                                {index + 1}. {entry.name}
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 700 }}>
                                                {entry.peakBac.toFixed(2)}
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '6px', opacity: 0.8, textAlign: 'center' }}>
                                            Picco alle {formatTime(entry.peakTime)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    )
}