'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import styles from '../styles/form.module.css'

export default function GroupPage() {
    const router = useRouter()

    const [dayLabel, setDayLabel] = useState('')
    const [activeTab, setActiveTab] = useState('alcohol')
    const [showFullRanking, setShowFullRanking] = useState(false)

    const [counters, setCounters] = useState({
        beer: 0,
        cocktail: 0,
        shot: 0
    })

    const [rankingAlcohol, setRankingAlcohol] = useState([])
    const [rankingPeak, setRankingPeak] = useState([])

    const [beerAward, setBeerAward] = useState(null)
    const [cocktailAward, setCocktailAward] = useState(null)
    const [missileAward, setMissileAward] = useState(null)

    function getDayBounds(now = new Date()) {
        const current = new Date(now)

        const start = new Date(current)
        start.setHours(8, 0, 0, 0)

        if (current.getHours() < 8) {
            start.setDate(start.getDate() - 1)
        }

        const end = new Date(start)
        end.setDate(end.getDate() + 1)

        return { start, end }
    }

    function getDayStart(now = new Date()) {
        const current = new Date(now)

        const start = new Date(current)
        start.setHours(8, 0, 0, 0)

        if (current.getHours() < 8) {
            start.setDate(start.getDate() - 1)
        }

        return start
    }

    function getDayLabel(now = new Date()) {
        const current = new Date(now)

        const day = new Date(current)
        day.setHours(8, 0, 0, 0)

        if (current.getHours() < 8) {
            day.setDate(day.getDate() - 1)
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

        const giornoSettimana = giorni[day.getDay()]
        const numero = day.getDate()

        return `${giornoSettimana.toLocaleUpperCase('it-IT')} ${numero}`
    }

    function gramsOfAlcohol(drink) {
        return drink.volume_ml * (drink.perc_alc / 100) * 0.789
    }

    async function loadTodayLogs() {
        const { start, end } = getDayBounds()

        const { data } = await supabase
            .from('drink_logs')
            .select('*')
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString())

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
                totalGrams: 0,
                counts: {
                    beer: 0,
                    cocktail: 0,
                    shot: 0
                }
            }
        }

        for (const log of logs) {
            const drink = drinks.find((d) => String(d.id) === String(log.drink_id))
            if (!drink) continue

            const entry = userMap[log.user_id]
            if (!entry) continue

            entry.totalGrams += gramsOfAlcohol(drink)

            if (drink.category === 'beer') entry.counts.beer++
            if (drink.category === 'cocktail') entry.counts.cocktail++
            if (drink.category === 'shot') entry.counts.shot++
        }

        return Object.values(userMap).sort((a, b) => {
            if (b.totalGrams !== a.totalGrams) {
                return b.totalGrams - a.totalGrams
            }

            return a.weight - b.weight
        })
    }

    function computePeakRanking(peaks, users) {
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
            if (!userMap[peak.user_id]) continue

            userMap[peak.user_id] = {
                ...userMap[peak.user_id],
                peakBac: Number(peak.peak_bac),
                peakTime: peak.peak_time
            }
        }

        return Object.values(userMap).sort((a, b) => {
            if (b.peakBac !== a.peakBac) {
                return b.peakBac - a.peakBac
            }

            return a.weight - b.weight
        })
    }

    function computeBeerAward(logs, drinks, users) {
        const userMap = {}

        for (const user of users) {
            userMap[user.id] = {
                userId: user.id,
                name: user.nickname,
                weight: Number(user.peso_kg),
                totalBeerMl: 0
            }
        }

        for (const log of logs) {
            const drink = drinks.find((d) => String(d.id) === String(log.drink_id))
            if (!drink || drink.category !== 'beer') continue

            const entry = userMap[log.user_id]
            if (!entry) continue

            entry.totalBeerMl += Number(drink.volume_ml)
        }

        return Object.values(userMap).sort((a, b) => {
            if (b.totalBeerMl !== a.totalBeerMl) {
                return b.totalBeerMl - a.totalBeerMl
            }

            return a.weight - b.weight
        })[0] || null
    }

    function computeCocktailAward(logs, drinks, users) {
        const userMap = {}

        for (const user of users) {
            userMap[user.id] = {
                userId: user.id,
                name: user.nickname,
                weight: Number(user.peso_kg),
                cocktailCount: 0
            }
        }

        for (const log of logs) {
            const drink = drinks.find((d) => String(d.id) === String(log.drink_id))
            if (!drink || drink.category !== 'cocktail') continue

            const entry = userMap[log.user_id]
            if (!entry) continue

            entry.cocktailCount += 1
        }

        return Object.values(userMap).sort((a, b) => {
            if (b.cocktailCount !== a.cocktailCount) {
                return b.cocktailCount - a.cocktailCount
            }

            return a.weight - b.weight
        })[0] || null
    }
    function computeMissileAward(logs, drinks, users) {
        const userMap = {}

        for (const user of users) {
            userMap[user.id] = {
                userId: user.id,
                name: user.nickname,
                weight: Number(user.peso_kg),
                maxGrams1h: 0,
                time: null
            }
        }

        // raggruppa log per utente
        const logsByUser = {}

        for (const log of logs) {
            if (!logsByUser[log.user_id]) {
                logsByUser[log.user_id] = []
            }
            logsByUser[log.user_id].push(log)
        }

        for (const userId in logsByUser) {
            const userLogs = logsByUser[userId]
                .map(log => {
                    const drink = drinks.find(d => String(d.id) === String(log.drink_id))
                    if (!drink) return null

                    return {
                        time: new Date(log.created_at).getTime(),
                        grams: drink.volume_ml * (drink.perc_alc / 100) * 0.789
                    }
                })
                .filter(Boolean)
                .sort((a, b) => a.time - b.time)

            for (let i = 0; i < userLogs.length; i++) {
                let sum = 0

                for (let j = i; j < userLogs.length; j++) {
                    const diff = userLogs[j].time - userLogs[i].time

                    if (diff > 3600000) break

                    sum += userLogs[j].grams

                    // 👇 QUI dentro
                    if (sum > userMap[userId].maxGrams1h) {
                        userMap[userId].maxGrams1h = sum
                        userMap[userId].time = userLogs[j].time
                    }
                }
            }
        }

        return Object.values(userMap).sort((a, b) => {
            if (b.maxGrams1h !== a.maxGrams1h) {
                return b.maxGrams1h - a.maxGrams1h
            }

            return a.weight - b.weight
        })[0] || null
    }

    function formatTime(timestamp) {
        if (!timestamp) return '—'

        return new Date(timestamp).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Athens'
        })
    }

    function formatLiters(ml) {
        return `${(ml / 1000).toFixed(1)} L`
    }

    useEffect(() => {
        async function load() {
            setDayLabel(getDayLabel())


            const logs = await loadTodayLogs()

            const { data: drinks } = await supabase
                .from('drinks')
                .select('*')

            const { data: users } = await supabase
                .from('users')
                .select('*')

            const dayStart = getDayStart().toISOString()

            const { data: peaks } = await supabase
                .from('daily_bac_peaks')
                .select('*')
                .eq('day_start', dayStart)

            const safeDrinks = drinks || []
            const safeUsers = users || []
            const safePeaks = peaks || []

            setCounters(computeCounters(logs, safeDrinks))
            setRankingAlcohol(computeAlcoholRanking(logs, safeDrinks, safeUsers))
            setRankingPeak(computePeakRanking(safePeaks, safeUsers))
            setBeerAward(computeBeerAward(logs, safeDrinks, safeUsers))
            setCocktailAward(computeCocktailAward(logs, safeDrinks, safeUsers))
            setMissileAward(computeMissileAward(logs, safeDrinks, safeUsers))
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

    function renderCounts(counts) {
        return (
            <div
                style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    marginTop: '6px',
                    opacity: 0.8
                }}
            >
                {counts.beer > 0 && <span>🍺 {counts.beer}</span>}
                {counts.cocktail > 0 && <span>🍹 {counts.cocktail}</span>}
                {counts.shot > 0 && <span>🥃 {counts.shot}</span>}
            </div>
        )
    }

    function renderAlcoholCard(entry, medal = null) {
        if (!entry) return null

        return (
            <div
                key={`${entry.userId}-${medal || 'entry'}`}
                style={{
                    border: '1px solid #2a2a2a',
                    borderRadius: '16px',
                    padding: '14px',
                    background: '#111',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}
            >
                {medal && <div style={{ fontSize: '22px' }}>{medal}</div>}
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{entry.name}</div>
                <div style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1 }}>
                    {Math.round(entry.totalGrams)} g
                </div>
                {renderCounts(entry.counts)}
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
                    borderRadius: '16px',
                    padding: '14px',
                    background: '#111',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}
            >
                {medal && <div style={{ fontSize: '22px' }}>{medal}</div>}
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{entry.name}</div>
                <div style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1 }}>
                    {entry.peakBac.toFixed(2)}
                </div>
                <div style={{ opacity: 0.8 }}>Picco alle {formatTime(entry.peakTime)}</div>
            </div>
        )
    }

    function renderAwardCard(title, emoji, name, value) {
        return (
            <div
                style={{
                    border: '1px solid #2a2a2a',
                    borderRadius: '16px',
                    padding: '14px',
                    background: '#111',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}
            >
                <div style={{ fontSize: '22px' }}>{emoji}</div>
                <div style={{ fontSize: '16px', opacity: 0.8 }}>{title}</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>
                    {value}
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
                <h1 className={styles.title}>Gruppo</h1>

                <button
                    className={styles.button}
                    onClick={() => router.push('/home')}
                    style={{ marginBottom: '10px' }}
                >
                    ← Torna alla Home
                </button>

                <p
                    style={{
                        textAlign: 'center',
                        fontSize: '18px',
                        marginTop: '10px',
                        opacity: 0.8
                    }}
                >
                    {dayLabel}
                </p>

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
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            marginTop: '20px'
                        }}
                    >
                        {podium[0] && renderAlcoholCard(podium[0], '🥇')}
                        {podium[1] && renderAlcoholCard(podium[1], '🥈')}
                        {podium[2] && renderAlcoholCard(podium[2], '🥉')}

                        {lastPlace && (
                            <>
                                <div
                                    style={{
                                        textAlign: 'center',
                                        marginTop: '10px',
                                        fontSize: '14px',
                                        letterSpacing: '0.12em',
                                        opacity: 0.7
                                    }}
                                >
                                    IL DISPIACERE
                                </div>

                                {renderAlcoholCard(lastPlace)}
                            </>
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

                                        {renderCounts(entry.counts)}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div
                            style={{
                                textAlign: 'center',
                                marginTop: '14px',
                                fontSize: '14px',
                                letterSpacing: '0.12em',
                                opacity: 0.7
                            }}
                        >
                            PREMI GIORNALIERI
                        </div>

                        {beerAward &&
                            renderAwardCard(
                                'Re della birra',
                                '🍺',
                                beerAward.name,
                                formatLiters(beerAward.totalBeerMl)
                            )}

                        {cocktailAward &&
                            renderAwardCard(
                                'Macchina da cocktail',
                                '🍹',
                                cocktailAward.name,
                                `${cocktailAward.cocktailCount} cocktail`
                            )}
                        {missileAward &&
                            renderAwardCard(
                                'Missile',
                                '🚀',
                                missileAward.name,
                                <>
                                    {Math.round(missileAward.maxGrams1h)} g / 1h
                                    <div style={{ opacity: 0.8, marginTop: '4px' }}>
                                        alle {formatTime(missileAward.time)}
                                    </div>
                                </>
                            )}
                    </div>
                )}

                {activeTab === 'peak' && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            marginTop: '20px'
                        }}
                    >
                        {podium[0] && renderPeakCard(podium[0], '🥇')}
                        {podium[1] && renderPeakCard(podium[1], '🥈')}
                        {podium[2] && renderPeakCard(podium[2], '🥉')}

                        {lastPlace && (
                            <>
                                <div
                                    style={{
                                        textAlign: 'center',
                                        marginTop: '10px',
                                        fontSize: '14px',
                                        letterSpacing: '0.12em',
                                        opacity: 0.7
                                    }}
                                >
                                    IL DISPIACERE
                                </div>

                                {renderPeakCard(lastPlace)}
                            </>
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