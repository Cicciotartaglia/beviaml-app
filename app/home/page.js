'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import styles from './home.module.css'

export default function Home() {
  const router = useRouter()

  const [drinks, setDrinks] = useState([])
  const [logs, setLogs] = useState([])
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [vacanzaAttiva, setVacanzaAttiva] = useState(false)

  function calculateBAC(user, drinks, now = Date.now()) {
    const K = 0.11
    const LOOKBACK_HOURS = 12

    const weightKg = user.weightKg
    const heightCm = user.heightCm

    const heightM = heightCm / 100
    const bmi = weightKg / (heightM * heightM)

    let r = 1.0181 - 0.01213 * bmi
    r = Math.max(0.45, Math.min(0.85, r))

    let bac = 0

    for (const drink of drinks) {
      const hoursSinceDrink = (now - drink.timestamp) / 3600000

      if (hoursSinceDrink < 0 || hoursSinceDrink > LOOKBACK_HOURS) continue

      const grams = drink.volumeMl * (drink.abv / 100) * 0.789
      const deltaBAC = grams / (r * weightKg)
      const contribution = Math.max(0, deltaBAC - K * hoursSinceDrink)

      bac += contribution
    }

    return Math.max(0, bac)
  }

  function buildBACDrinks() {
    const result = []

    for (const log of logs) {
      const drink = drinks.find((d) => String(d.id) === String(log.drink_id))

      if (drink) {
        result.push({
          volumeMl: drink.volume_ml,
          abv: drink.perc_alc,
          timestamp: new Date(log.created_at).getTime()
        })
      }
    }

    return result
  }

  function getState(bac) {
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000
    const now = Date.now()

    let beerCount = 0
    let cocktailCount = 0

    for (const log of logs) {
      const logTime = new Date(log.created_at).getTime()
      const diff = now - logTime

      if (diff < 0 || diff > THREE_HOURS_MS) continue

      const drink = drinks.find((d) => String(d.id) === String(log.drink_id))
      if (!drink) continue

      const category = drink.category?.trim().toLowerCase()

      if (category === 'beer') beerCount++
      if (category === 'cocktail') cocktailCount++
    }

    if (beerCount >= 4) return 'BIRRA'
    if (cocktailCount >= 4) return 'COCKTAIL'
    if (bac < 0.2) return 'SOBRIO'
    if (bac < 0.6) return 'MEDIO BAC'
    if (bac < 1.2) return 'ALTO BAC'
    return 'LEGGENDA'
  }

  function getSoberCountdown(bac) {
    if (bac <= 0) return 'Sobrio'

    const hours = bac / 0.11
    const totalMinutes = Math.ceil(hours * 60)

    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mm = String(totalMinutes % 60).padStart(2, '0')

    return `Sobrio tra ${hh}:${mm}`
  }

  async function loadLogs(userId) {
    const { data } = await supabase
      .from('drink_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    setLogs(data || [])
  }

  async function loadUser(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    setUser(data)
  }

  useEffect(() => {
    const userId = localStorage.getItem('user_id')

    if (!userId) {
      router.push('/')
      return
    }

    async function loadAll() {
      const { data: drinksData } = await supabase
        .from('drinks')
        .select('*')
        .eq('is_active', true)

      setDrinks(drinksData || [])

      await loadLogs(userId)
      await loadUser(userId)

      const { data: config } = await supabase
        .from('app_config')
        .select('*')
        .eq('key', 'vacanza_attiva')
        .single()

      setVacanzaAttiva(config?.value || false)
    }

    loadAll()
  }, [router])

  const bacDrinks = buildBACDrinks()

  const bac = user
    ? calculateBAC(
      {
        weightKg: user.peso_kg,
        heightCm: user.altezza_cm
      },
      bacDrinks
    )
    : 0

  const stato = getState(bac)
  const soberText = getSoberCountdown(bac)

  const maxBac = 2.0
  const redStart = 1.4

  const fillPercent = Math.max(0, Math.min((bac / maxBac) * 100, 100))
  const redStartPercent = (redStart / maxBac) * 100

  const displayedLogs = useMemo(() => logs.slice(0, 5), [logs])

  async function handleDrinkClick(drinkId) {
    const userId = localStorage.getItem('user_id')
    if (!userId) return

    await supabase.from('drink_logs').insert({
      user_id: userId,
      drink_id: drinkId
    })

    if (navigator.vibrate) navigator.vibrate(35)

    await loadLogs(userId)
  }

  async function handleUndo() {
    if (logs.length === 0) return

    await supabase
      .from('drink_logs')
      .delete()
      .eq('id', logs[0].id)

    const userId = localStorage.getItem('user_id')
    await loadLogs(userId)
  }

  function handleSwitchUser() {
    localStorage.removeItem('user_id')
    router.push('/')
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.menuButton}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ☰
        </button>

        {menuOpen && (
          <div className={styles.menuDropdown}>
            <div className={styles.menuNickname}>
              {user ? user.nickname : 'Utente'}
            </div>

            <button onClick={handleSwitchUser}>Cambia utente</button>

            <button onClick={() => router.push('/group')}>
              Gruppo
            </button>

            {vacanzaAttiva && (
              <button onClick={() => router.push('/vacanza')}>
                Vacanza
              </button>
            )}

            <button onClick={() => router.push('/admin')}>
              Admin
            </button>
          </div>
        )}
      </header>

      <section className={styles.bacSection}>
        <p className={styles.stateLabel}>{stato}</p>

        <div className={styles.gaugeWrap}>
          <svg
            viewBox="0 0 320 120"
            className={styles.gauge}
            aria-label="BAC gauge"
          >
            <path
              d="M20 100 L95 25 L260 25 L300 25"
              className={styles.gaugeBase}
            />

            <path
              d="M20 100 L95 25 L260 25"
              className={styles.gaugeFill}
              style={{
                strokeDasharray: '400',
                strokeDashoffset: `${400 - (Math.min(fillPercent, redStartPercent) / 100) * 400}`
              }}
            />

            <path
              d="M260 25 L300 25"
              className={styles.gaugeRedBase}
            />

            {fillPercent > redStartPercent && (
              <path
                d="M260 25 L300 25"
                className={styles.gaugeRedFill}
                style={{
                  strokeDasharray: '60',
                  strokeDashoffset: `${60 - ((fillPercent - redStartPercent) / (100 - redStartPercent)) * 60}`
                }}
              />
            )}
          </svg>
        </div>

        <div className={styles.bacValue}>{bac.toFixed(2)}</div>
        <div className={styles.soberText}>{soberText}</div>
      </section>

      <section className={styles.grid}>
        {drinks.map((drink) => (
          <button
            key={drink.id}
            className={styles.drinkButton}
            onClick={() => handleDrinkClick(drink.id)}
          >
            <span>{drink.emoji}</span>
            <span>{drink.name}</span>
          </button>
        ))}

        <button className={styles.drinkButton} onClick={handleUndo}>
          ↩ Annulla
        </button>
      </section>

      <section className={styles.logsSection}>
        <h3>Ultime bevute</h3>

        <ul>
          {displayedLogs.map((log) => {
            const drink = drinks.find((d) => String(d.id) === String(log.drink_id))


            const fillPercent = Math.max(0, Math.min((bac / maxBac) * 100, 100))
            const redStartPercent = (redStart / maxBac) * 100
            return (
              <li key={log.id}>
                {drink?.emoji} {drink?.name} —{' '}
                {new Date(log.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}