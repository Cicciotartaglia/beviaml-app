'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { TABLES } from '../../lib/tableNames'
import styles from './home.module.css'

/*
===============================================================================
HOME PAGE - V2
===============================================================================

Questa è la schermata principale dell'app.

OBIETTIVI DELLA V2:

- mantenere l'inserimento delle bevute estremamente rapido
- dare maggiore importanza ai pulsanti dei drink
- mantenere il BAC come elemento visivo interessante
- abbandonare il vecchio contagiri
- utilizzare un design più pulito e minimale
- mostrare fino a 10 bevute recenti

IMPORTANTE:

In questa fase NON modifichiamo ancora:

- algoritmo BAC
- logica delle frasi
- sistema dei picchi
- struttura del database

Cambiamo principalmente la PRESENTAZIONE della Home.

===============================================================================
*/

export default function Home() {
  const router = useRouter()

  // ==========================================================================
  // STATO DELLA PAGINA
  // ==========================================================================

  const [drinks, setDrinks] = useState([])
  const [logs, setLogs] = useState([])
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [vacanzaAttiva, setVacanzaAttiva] = useState(false)
  const [phrases, setPhrases] = useState([])

  // ==========================================================================
  // CALCOLO BAC
  // ==========================================================================

  /*
   * Algoritmo BAC attuale.
   *
   * NON lo modifichiamo ancora.
   *
   * Verrà analizzato separatamente perché durante Creta 2026
   * ha prodotto valori che ci sono sembrati troppo elevati.
   */
  function calculateBAC(user, drinks, now = Date.now()) {
    const K = 0.15

    const LOOKBACK_HOURS = 12
    const LOOKBACK_MS = LOOKBACK_HOURS * 60 * 60 * 1000

    const weightKg = user.weightKg
    const heightCm = user.heightCm

    const heightM = heightCm / 100
    const bmi = weightKg / (heightM * heightM)

    let r = 1.0181 - 0.01213 * bmi

    r = Math.max(0.45, Math.min(0.85, r))

    const validDrinks = drinks
      .filter((drink) => {
        const diff = now - drink.timestamp

        return diff >= 0 && diff <= LOOKBACK_MS
      })
      .sort((a, b) => a.timestamp - b.timestamp)

    if (validDrinks.length === 0) {
      return 0
    }

    let bac = 0

    let lastTimestamp = validDrinks[0].timestamp

    for (let i = 0; i < validDrinks.length; i++) {
      const drink = validDrinks[i]

      /*
       * Prima di aggiungere la nuova bevuta
       * sottraiamo lo smaltimento avvenuto
       * dalla bevuta precedente.
       */
      if (i > 0) {
        const hoursPassed =
          (drink.timestamp - lastTimestamp) / 3600000

        bac = Math.max(
          0,
          bac - K * hoursPassed
        )
      }

      /*
       * Grammi di alcol puro.
       */
      const grams =
        drink.volumeMl *
        (drink.abv / 100) *
        0.789

      const deltaBAC =
        grams /
        (r * weightKg)

      bac += deltaBAC

      lastTimestamp = drink.timestamp
    }

    /*
     * Smaltimento avvenuto dall'ultima bevuta
     * fino al momento attuale.
     */
    const finalHoursPassed =
      (now - lastTimestamp) / 3600000

    bac = Math.max(
      0,
      bac - K * finalHoursPassed
    )

    return Math.max(0, bac)
  }

  // ==========================================================================
  // CONVERSIONE LOG -> FORMATO BAC
  // ==========================================================================

  function buildBACDrinks() {
    const result = []

    for (const log of logs) {
      const drink = drinks.find(
        (d) =>
          String(d.id) === String(log.drink_id)
      )

      if (!drink) {
        continue
      }

      result.push({
        volumeMl: drink.volume_ml,
        abv: drink.perc_alc,
        timestamp: new Date(log.created_at).getTime()
      })
    }

    return result
  }

  // ==========================================================================
  // STATO UTILIZZATO PER LE FRASI
  // ==========================================================================

  /*
   * Questa funzione mantiene la vecchia logica.
   *
   * Le categorie BIRRA e COCKTAIL servono
   * esclusivamente per scegliere determinate frasi.
   */
  function getState(bac) {
    const THREE_HOURS_MS =
      3 * 60 * 60 * 1000

    const now = Date.now()

    let beerCount = 0
    let cocktailCount = 0

    for (const log of logs) {
      const logTime =
        new Date(log.created_at).getTime()

      const diff = now - logTime

      if (
        diff < 0 ||
        diff > THREE_HOURS_MS
      ) {
        continue
      }

      const drink = drinks.find(
        (d) =>
          String(d.id) === String(log.drink_id)
      )

      if (!drink) {
        continue
      }

      const category =
        drink.category
          ?.trim()
          .toLowerCase()

      if (category === 'beer') {
        beerCount++
      }

      if (category === 'cocktail') {
        cocktailCount++
      }
    }

    if (beerCount >= 4) {
      return 'BIRRA'
    }

    if (cocktailCount >= 4) {
      return 'COCKTAIL'
    }

    if (bac < 0.2) {
      return 'SOBRIO'
    }

    if (bac < 0.6) {
      return 'MEDIO BAC'
    }

    if (bac < 1.2) {
      return 'ALTO BAC'
    }

    return 'LEGGENDA'
  }

  // ==========================================================================
  // STATO VISIVO DELLA CARD BAC
  // ==========================================================================

  /*
   * A differenza di getState(), questa funzione NON considera
   * il numero di birre o cocktail.
   *
   * Serve solamente per mostrare nella card il livello BAC.
   */
  function getBACVisualState(bac) {
    if (bac < 0.2) {
      return {
        label: 'SOBRIO',
        className: styles.statusSober
      }
    }

    if (bac < 0.6) {
      return {
        label: 'MEDIO',
        className: styles.statusMedium
      }
    }

    if (bac < 1.2) {
      return {
        label: 'ALTO',
        className: styles.statusHigh
      }
    }

    if (bac < 2) {
      return {
        label: 'MOLTO ALTO',
        className: styles.statusVeryHigh
      }
    }

    return {
      label: 'LEGGENDA',
      className: styles.statusLegend
    }
  }

  // ==========================================================================
  // FRASE DIVERTENTE
  // ==========================================================================

  function getPhrase(category) {
    const normalizedCategory =
      category
        ?.trim()
        .toUpperCase()

    const matchingPhrases =
      phrases.filter(
        (phrase) =>
          phrase.category
            ?.trim()
            .toUpperCase() ===
          normalizedCategory
      )

    if (matchingPhrases.length === 0) {
      return category
    }

    const randomIndex =
      Math.floor(
        Math.random() *
        matchingPhrases.length
      )

    return (
      matchingPhrases[randomIndex].text ||
      category
    )
  }

  // ==========================================================================
  // STIMA RITORNO A ZERO
  // ==========================================================================

  /*
   * Manteniamo temporaneamente la vecchia formula.
   *
   * NOTA:
   * utilizza 0.11 mentre calculateBAC usa 0.13.
   * Questa incoerenza verrà affrontata quando
   * rifaremo l'algoritmo BAC.
   */
  function getSoberCountdown(bac) {
    if (bac <= 0) {
      return 'Sobrio'
    }

    const hours = bac / 0.15

    const totalMinutes =
      Math.ceil(hours * 60)

    const hh =
      Math.floor(totalMinutes / 60)

    const mm =
      totalMinutes % 60

    /*
     * Formato più leggibile rispetto al vecchio HH:MM.
     *
     * Esempio:
     *
     * 4 h 20 min
     */
    if (hh <= 0) {
      return `${mm} min`
    }

    return `${hh} h ${mm} min`
  }

  // ==========================================================================
  // CARICAMENTO LOG
  // ==========================================================================

  async function loadLogs(userId) {
    const { data } =
      await supabase
        .from(TABLES.drinkLogs)
        .select('*')
        .eq('user_id', userId)
        .order(
          'created_at',
          {
            ascending: false
          }
        )

    setLogs(data || [])
  }

  // ==========================================================================
  // CARICAMENTO UTENTE
  // ==========================================================================

  async function loadUser(userId) {
    const { data } =
      await supabase
        .from(TABLES.users)
        .select('*')
        .eq('id', userId)
        .single()

    setUser(data)
  }

  // ==========================================================================
  // CARICAMENTO INIZIALE
  // ==========================================================================

  useEffect(() => {
    const userId =
      localStorage.getItem('user_id')

    if (!userId) {
      router.push('/')
      return
    }

    async function loadAll() {
      /*
       * Drink attivi.
       */
      const {
        data: drinksData
      } =
        await supabase
          .from(TABLES.drinks)
          .select('*')
          .eq('is_active', true)

      setDrinks(drinksData || [])

      /*
       * Frasi attive.
       */
      const {
        data: phrasesData
      } =
        await supabase
          .from(TABLES.phrases)
          .select('*')
          .eq('is_active', true)

      setPhrases(phrasesData || [])

      /*
       * Dati personali.
       */
      await loadLogs(userId)
      await loadUser(userId)

      /*
       * Configurazione pagina Vacanza.
       */
      const {
        data: config
      } =
        await supabase
          .from(TABLES.appConfig)
          .select('*')
          .eq('key', 'vacanza_attiva')
          .single()

      setVacanzaAttiva(
        config?.value || false
      )
    }

    loadAll()
  }, [router])

  // ==========================================================================
  // DATI DERIVATI
  // ==========================================================================

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

  /*
   * Stato utilizzato per scegliere la frase.
   */
  const stato = getState(bac)

  const fraseCorrente =
    getPhrase(stato)

  /*
   * Stato utilizzato invece dalla card BAC.
   */
  const bacVisualState =
    getBACVisualState(bac)

  const soberText =
    getSoberCountdown(bac)

  // ==========================================================================
  // POSIZIONE DEL PALLINO SULLA SCALA BAC
  // ==========================================================================

  /*
   * La nuova scala visiva va da:
   *
   * 0 -> 3.0
   *
   * Qualunque valore superiore viene bloccato
   * all'estremità destra.
   */
  const BAC_SCALE_MAX = 3

  const bacMarkerPosition =
    Math.min(
      100,
      Math.max(
        0,
        (bac / BAC_SCALE_MAX) * 100
      )
    )

  // ==========================================================================
  // ULTIME 10 BEVUTE
  // ==========================================================================

  /*
   * Nella V1 erano solamente 5.
   *
   * Dopo l'utilizzo reale abbiamo deciso
   * di portarle a 10.
   */
  const displayedLogs =
    useMemo(
      () => logs.slice(0, 10),
      [logs]
    )

  // ==========================================================================
  // GIORNATA 08:00 -> 08:00
  // ==========================================================================

  function getDayStart(now = new Date()) {
    const current =
      new Date(now)

    const start =
      new Date(current)

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

  // ==========================================================================
  // AGGIORNAMENTO PICCO BAC
  // ==========================================================================

  async function updateDailyBacPeak(
    userId,
    updatedLogs
  ) {
    if (!user) return

    const bacDrinks =
      updatedLogs
        .map((log) => {
          const drink =
            drinks.find(
              (d) =>
                String(d.id) ===
                String(log.drink_id)
            )

          if (!drink) {
            return null
          }

          return {
            volumeMl: drink.volume_ml,
            abv: drink.perc_alc,
            timestamp:
              new Date(log.created_at).getTime()
          }
        })
        .filter(Boolean)

    const currentBac =
      calculateBAC(
        {
          weightKg: user.peso_kg,
          heightCm: user.altezza_cm
        },
        bacDrinks
      )

    const now =
      new Date()

    const dayStart =
      getDayStart(now).toISOString()

    const {
      data: existingPeak
    } =
      await supabase
        .from(TABLES.dailyBacPeaks)
        .select('*')
        .eq('user_id', userId)
        .eq('day_start', dayStart)
        .maybeSingle()

    if (!existingPeak) {
      await supabase
        .from(TABLES.dailyBacPeaks)
        .insert({
          user_id: userId,
          day_start: dayStart,
          peak_bac: currentBac,
          peak_time: now.toISOString()
        })

      return
    }

    if (
      currentBac >
      Number(
        existingPeak.peak_bac || 0
      )
    ) {
      await supabase
        .from(TABLES.dailyBacPeaks)
        .update({
          peak_bac: currentBac,
          peak_time: now.toISOString()
        })
        .eq('id', existingPeak.id)
    }
  }

  // ==========================================================================
  // INSERIMENTO BEVUTA
  // ==========================================================================

  async function handleDrinkClick(drinkId) {
    const userId =
      localStorage.getItem('user_id')

    if (!userId) return

    await supabase
      .from(TABLES.drinkLogs)
      .insert({
        user_id: userId,
        drink_id: drinkId
      })

    /*
     * Feedback aptico sui dispositivi compatibili.
     */
    if (navigator.vibrate) {
      navigator.vibrate(35)
    }

    /*
     * Ricarichiamo immediatamente i log.
     */
    const {
      data: updatedLogs
    } =
      await supabase
        .from(TABLES.drinkLogs)
        .select('*')
        .eq('user_id', userId)
        .order(
          'created_at',
          {
            ascending: false
          }
        )

    setLogs(updatedLogs || [])

    await updateDailyBacPeak(
      userId,
      updatedLogs || []
    )
  }

  // ==========================================================================
  // ANNULLA ULTIMA BEVUTA
  // ==========================================================================

  async function handleUndo() {
    if (logs.length === 0) {
      return
    }

    await supabase
      .from(TABLES.drinkLogs)
      .delete()
      .eq('id', logs[0].id)

    const userId =
      localStorage.getItem('user_id')

    await loadLogs(userId)
  }

  // ==========================================================================
  // CAMBIO UTENTE
  // ==========================================================================

  function handleSwitchUser() {
    const confirmed =
      window.confirm(
        'Non cambiare utente se non necessario.\n\nSei sicuro di voler continuare? Potresti creare confusione nei test o nei dati salvati.'
      )

    if (!confirmed) return

    localStorage.removeItem('user_id')

    setMenuOpen(false)

    router.push('/')
  }

  // ==========================================================================
  // INTERFACCIA
  // ==========================================================================

  return (
    <main className={styles.page}>

      {/* ================================================================
          HEADER
          ================================================================ */}

      <header className={styles.header}>
        <button
          className={styles.menuButton}
          onClick={() =>
            setMenuOpen(
              (prev) => !prev
            )
          }
          aria-label="Apri menu"
        >
          ☰
        </button>

        {menuOpen && (
          <div className={styles.menuDropdown}>
            <div className={styles.menuNickname}>
              {user
                ? user.nickname
                : 'Utente'}
            </div>

            <div className={styles.menuWarning}>
              Non cambiare utente se non necessario
            </div>

            <button
              onClick={handleSwitchUser}
            >
              Cambia utente
            </button>

            <button
              onClick={() =>
                router.push('/group')
              }
            >
              Gruppo
            </button>

            <button
              onClick={() =>
                router.push('/vacanze')
              }
            >
              Vecchie vacanze
            </button>

            {vacanzaAttiva && (
              <button
                onClick={() =>
                  router.push('/vacanza')
                }
              >
                Vacanza
              </button>
            )}

            <button
              onClick={() =>
                router.push('/admin')
              }
            >
              Admin
            </button>
          </div>
        )}
      </header>

      {/* ================================================================
          FRASE DIVERTENTE
          ================================================================ */}

      <section className={styles.phraseSection}>
        <h1 className={styles.phrase}>
          {fraseCorrente}
        </h1>

        <div className={styles.phraseAccent} />
      </section>

      {/* ================================================================
          CARD BAC
          ================================================================ */}

      <section className={styles.bacCard}>
        <div className={styles.bacHeader}>
          <div>
            <div className={styles.bacLabel}>
              BAC ATTUALE
            </div>

            <div className={styles.bacValue}>
              {bac.toFixed(2)}
            </div>

            <div
              className={`${styles.bacStatus} ${bacVisualState.className}`}
            >
              <span className={styles.statusDot} />

              {bacVisualState.label}
            </div>
          </div>

          <div className={styles.soberBox}>
            <span className={styles.soberIcon}>
              ◷
            </span>

            <div>
              <div className={styles.soberLabel}>
                Ritorno a zero tra
              </div>

              <div className={styles.soberValue}>
                {soberText}
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------
            SCALA BAC
            -------------------------------------------------------------- */}

        <div className={styles.scaleWrapper}>
          <div className={styles.scale}>
            <div className={styles.scaleGradient} />

            <div
              className={styles.scaleMarker}
              style={{
                left: `${bacMarkerPosition}%`
              }}
            />
          </div>

          <div className={styles.scaleLabels}>
            <span>0</span>
            <span>0,5</span>
            <span>1,0</span>
            <span>1,5</span>
            <span>2,0</span>
            <span>2,5</span>
            <span>3,0+</span>
          </div>
        </div>
      </section>

      {/* ================================================================
          INSERIMENTO BEVUTE
          ================================================================ */}

      <section className={styles.drinksSection}>
        <h2 className={styles.sectionTitle}>
          Aggiungi una bevuta
        </h2>

        <div className={styles.grid}>
          {drinks.map((drink) => (
            <button
              key={drink.id}
              className={styles.drinkButton}
              onClick={() =>
                handleDrinkClick(drink.id)
              }
            >
              <span className={styles.drinkEmoji}>
                {drink.emoji}
              </span>

              <span className={styles.drinkName}>
                {drink.name}
              </span>

              <span className={styles.drinkDetails}>
                {drink.perc_alc}%
              </span>
            </button>
          ))}
        </div>

        {/* --------------------------------------------------------------
            ANNULLA
            -------------------------------------------------------------- */}

        <button
          className={styles.undoButton}
          onClick={handleUndo}
        >
          ↶
          <span>
            Annulla ultima bevuta
          </span>
        </button>
      </section>

      {/* ================================================================
          ULTIME 10 BEVUTE
          ================================================================ */}

      <section className={styles.logsSection}>
        <h2 className={styles.sectionTitle}>
          Ultime bevute
        </h2>

        <div className={styles.logsList}>
          {displayedLogs.map((log) => {
            const drink =
              drinks.find(
                (d) =>
                  String(d.id) ===
                  String(log.drink_id)
              )

            return (
              <div
                key={log.id}
                className={styles.logRow}
              >
                <div className={styles.logDrink}>
                  <span className={styles.logEmoji}>
                    {drink?.emoji}
                  </span>

                  <span>
                    {drink?.name}
                  </span>
                </div>

                <span className={styles.logTime}>
                  {new Date(
                    log.created_at
                  ).toLocaleTimeString(
                    [],
                    {
                      hour: '2-digit',
                      minute: '2-digit'
                    }
                  )}
                </span>
              </div>
            )
          })}

          {displayedLogs.length === 0 && (
            <div className={styles.emptyLogs}>
              Nessuna bevuta registrata
            </div>
          )}
        </div>
      </section>
    </main>
  )
}