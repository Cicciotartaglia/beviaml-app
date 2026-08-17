'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

import {
  TABLES,
  ACTIVE_DATASET_NAME
} from '../../lib/tableNames'

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


MODALITÀ LIMBO
-------------------------------------------------------------------------------

Quando ACTIVE_DATASET_NAME === 'limbo':

- la Home normale NON viene caricata;
- non vengono effettuate query sui dati Limbo;
- non vengono mostrati BAC, drink, statistiche o storico;
- l'utente viene automaticamente mandato a:

      /standby

La pagina Standby permette solamente di:

- consultare le vecchie vacanze;
- accedere all'Admin.

In questo modo la versione online dell'app può restare disponibile
anche quando non è in corso nessuna vacanza reale.

===============================================================================
*/

export default function Home() {
  const router = useRouter()

  // ==========================================================================
  // MODALITÀ LIMBO
  // ==========================================================================

  /*
   * ACTIVE_DATASET_NAME viene deciso in:
   *
   *     lib/tableNames.js
   *
   * In locale normalmente avremo:
   *
   *     test
   *
   * mentre sulla versione online, quando non è in corso
   * una vacanza, avremo:
   *
   *     limbo
   */
  const isLimbo =
    ACTIVE_DATASET_NAME === 'limbo'

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
   * K rappresenta il decadimento orario utilizzato
   * per stimare lo smaltimento dell'alcol.
   *
   * Dopo l'analisi dei dati reali di Creta 2026
   * abbiamo deciso di utilizzare:
   *
   *     K = 0.15
   */
  function calculateBAC(user, drinks, now = Date.now()) {
    const K = 0.15

    const LOOKBACK_HOURS = 12
    const LOOKBACK_MS =
      LOOKBACK_HOURS *
      60 *
      60 *
      1000

    const weightKg =
      user.weightKg

    const heightCm =
      user.heightCm

    const heightM =
      heightCm / 100

    const bmi =
      weightKg /
      (heightM * heightM)

    /*
     * Coefficiente di distribuzione r
     * stimato a partire dal BMI.
     */
    let r =
      1.0181 -
      0.01213 * bmi

    /*
     * Evitiamo valori estremi.
     */
    r =
      Math.max(
        0.45,
        Math.min(
          0.85,
          r
        )
      )

    /*
     * Consideriamo solamente le bevute:
     *
     * - non future;
     * - comprese nelle ultime 12 ore.
     */
    const validDrinks =
      drinks
        .filter(
          (drink) => {
            const diff =
              now -
              drink.timestamp

            return (
              diff >= 0 &&
              diff <=
              LOOKBACK_MS
            )
          }
        )
        .sort(
          (a, b) =>
            a.timestamp -
            b.timestamp
        )

    /*
     * Nessuna bevuta valida:
     * BAC = 0.
     */
    if (
      validDrinks.length ===
      0
    ) {
      return 0
    }

    let bac = 0

    let lastTimestamp =
      validDrinks[0]
        .timestamp

    /*
     * Ricostruiamo cronologicamente
     * l'andamento del BAC.
     */
    for (
      let i = 0;
      i < validDrinks.length;
      i++
    ) {
      const drink =
        validDrinks[i]

      /*
       * Prima di aggiungere la nuova bevuta
       * sottraiamo lo smaltimento avvenuto
       * dalla bevuta precedente.
       */
      if (i > 0) {
        const hoursPassed =
          (
            drink.timestamp -
            lastTimestamp
          ) /
          3600000

        bac =
          Math.max(
            0,
            bac -
            K *
            hoursPassed
          )
      }

      /*
       * Grammi di alcol puro.
       *
       * 0.789 = densità approssimativa
       * dell'etanolo in g/ml.
       */
      const grams =
        drink.volumeMl *
        (
          drink.abv /
          100
        ) *
        0.789

      /*
       * Incremento BAC prodotto
       * dalla bevuta.
       */
      const deltaBAC =
        grams /
        (
          r *
          weightKg
        )

      bac +=
        deltaBAC

      lastTimestamp =
        drink.timestamp
    }

    /*
     * Smaltimento avvenuto dall'ultima bevuta
     * fino al momento attuale.
     */
    const finalHoursPassed =
      (
        now -
        lastTimestamp
      ) /
      3600000

    bac =
      Math.max(
        0,
        bac -
        K *
        finalHoursPassed
      )

    return Math.max(
      0,
      bac
    )
  }

  // ==========================================================================
  // CONVERSIONE LOG -> FORMATO BAC
  // ==========================================================================

  /*
   * drink_logs contiene:
   *
   *     drink_id
   *     created_at
   *
   * calculateBAC() vuole invece:
   *
   *     volumeMl
   *     abv
   *     timestamp
   *
   * Questa funzione effettua la conversione.
   */
  function buildBACDrinks() {
    const result = []

    for (const log of logs) {
      const drink =
        drinks.find(
          (d) =>
            String(d.id) ===
            String(
              log.drink_id
            )
        )

      if (!drink) {
        continue
      }

      result.push({
        volumeMl:
          drink.volume_ml,

        abv:
          drink.perc_alc,

        timestamp:
          new Date(
            log.created_at
          ).getTime()
      })
    }

    return result
  }

  // ==========================================================================
  // STATO UTILIZZATO PER LE FRASI
  // ==========================================================================

  /*
   * Questa funzione determina quale categoria
   * di frase utilizzare.
   *
   * Oltre al BAC considera anche il numero
   * di birre/cocktail bevuti nelle ultime 3 ore.
   */
  function getState(bac) {
    const THREE_HOURS_MS =
      3 *
      60 *
      60 *
      1000

    const now =
      Date.now()

    let beerCount = 0
    let cocktailCount = 0

    for (const log of logs) {
      const logTime =
        new Date(
          log.created_at
        ).getTime()

      const diff =
        now -
        logTime

      /*
       * Ignoriamo:
       *
       * - bevute future;
       * - bevute più vecchie di 3 ore.
       */
      if (
        diff < 0 ||
        diff >
        THREE_HOURS_MS
      ) {
        continue
      }

      const drink =
        drinks.find(
          (d) =>
            String(d.id) ===
            String(
              log.drink_id
            )
        )

      if (!drink) {
        continue
      }

      const category =
        drink.category
          ?.trim()
          .toLowerCase()

      if (
        category ===
        'beer'
      ) {
        beerCount++
      }

      if (
        category ===
        'cocktail'
      ) {
        cocktailCount++
      }
    }

    /*
     * Le categorie BIRRA e COCKTAIL
     * hanno priorità sulla categoria BAC.
     */
    if (
      beerCount >= 4
    ) {
      return 'BIRRA'
    }

    if (
      cocktailCount >= 4
    ) {
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
   * A differenza di getState(),
   * questa funzione NON considera
   * il numero di birre o cocktail.
   *
   * Serve solamente per mostrare
   * il livello BAC nella card.
   */
  function getBACVisualState(
    bac
  ) {
    if (bac < 0.2) {
      return {
        label:
          'SOBRIO',

        className:
          styles.statusSober
      }
    }

    if (bac < 0.6) {
      return {
        label:
          'MEDIO',

        className:
          styles.statusMedium
      }
    }

    if (bac < 1.2) {
      return {
        label:
          'ALTO',

        className:
          styles.statusHigh
      }
    }

    if (bac < 2) {
      return {
        label:
          'MOLTO ALTO',

        className:
          styles.statusVeryHigh
      }
    }

    return {
      label:
        'LEGGENDA',

      className:
        styles.statusLegend
    }
  }

  // ==========================================================================
  // FRASE DIVERTENTE
  // ==========================================================================

  /*
   * Recupera casualmente una frase attiva
   * appartenente alla categoria selezionata.
   */
  function getPhrase(
    category
  ) {
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

    /*
     * Se non esiste nessuna frase,
     * mostriamo direttamente il nome
     * della categoria.
     */
    if (
      matchingPhrases.length ===
      0
    ) {
      return category
    }

    const randomIndex =
      Math.floor(
        Math.random() *
        matchingPhrases.length
      )

    return (
      matchingPhrases[
        randomIndex
      ].text ||
      category
    )
  }

  // ==========================================================================
  // STIMA RITORNO A ZERO
  // ==========================================================================

  /*
   * Utilizziamo lo stesso coefficiente
   * di decadimento del calcolo BAC:
   *
   *     K = 0.15 g/L/h
   */
  function getSoberCountdown(
    bac
  ) {
    if (bac <= 0) {
      return 'Sobrio'
    }

    const hours =
      bac / 0.15

    const totalMinutes =
      Math.ceil(
        hours * 60
      )

    const hh =
      Math.floor(
        totalMinutes /
        60
      )

    const mm =
      totalMinutes %
      60

    /*
     * Formato leggibile.
     *
     * Esempio:
     *
     *     4 h 20 min
     */
    if (hh <= 0) {
      return `${mm} min`
    }

    return `${hh} h ${mm} min`
  }

  // ==========================================================================
  // CARICAMENTO LOG
  // ==========================================================================

  /*
   * Carica tutte le bevute dell'utente
   * dal dataset attualmente selezionato.
   */
  async function loadLogs(
    userId
  ) {
    const { data } =
      await supabase
        .from(
          TABLES.drinkLogs
        )
        .select('*')
        .eq(
          'user_id',
          userId
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )

    setLogs(
      data || []
    )
  }

  // ==========================================================================
  // CARICAMENTO UTENTE
  // ==========================================================================

  /*
   * Recupera peso, altezza e nickname
   * dell'utente corrente.
   */
  async function loadUser(
    userId
  ) {
    const { data } =
      await supabase
        .from(
          TABLES.users
        )
        .select('*')
        .eq(
          'id',
          userId
        )
        .single()

    setUser(data)
  }

  // ==========================================================================
  // REDIRECT AUTOMATICO DEL LIMBO
  // ==========================================================================

  /*
   * Se il dataset attivo è LIMBO,
   * /home non deve essere utilizzata.
   *
   * Mandiamo immediatamente l'utente alla pagina:
   *
   *     /standby
   *
   * Usiamo replace() invece di push():
   *
   * se l'utente preme "indietro" dal browser
   * non vogliamo riportarlo alla Home completa.
   */
  useEffect(() => {
    if (isLimbo) {
      router.replace(
        '/standby'
      )
    }
  }, [
    isLimbo,
    router
  ])

  // ==========================================================================
  // CARICAMENTO INIZIALE
  // ==========================================================================

  useEffect(() => {
    /*
     * Nel Limbo NON carichiamo nessun dato della Home.
     *
     * Il redirect verso /standby viene gestito
     * dal useEffect precedente.
     *
     * Questo evita query inutili verso:
     *
     * users_limbo
     * drink_logs_limbo
     * daily_bac_peaks_limbo
     */
    if (isLimbo) {
      return
    }

    /*
     * Recuperiamo l'utente salvato
     * nel browser.
     */
    const userId =
      localStorage.getItem(
        'user_id'
      )

    /*
     * Se non esiste un utente selezionato,
     * torniamo alla registrazione/login.
     */
    if (!userId) {
      router.push('/')
      return
    }

    async function loadAll() {
      // ----------------------------------------------------------------------
      // DRINK ATTIVI
      // ----------------------------------------------------------------------

      const {
        data: drinksData
      } =
        await supabase
          .from(
            TABLES.drinks
          )
          .select('*')
          .eq(
            'is_active',
            true
          )

      setDrinks(
        drinksData || []
      )

      // ----------------------------------------------------------------------
      // FRASI ATTIVE
      // ----------------------------------------------------------------------

      const {
        data: phrasesData
      } =
        await supabase
          .from(
            TABLES.phrases
          )
          .select('*')
          .eq(
            'is_active',
            true
          )

      setPhrases(
        phrasesData || []
      )

      // ----------------------------------------------------------------------
      // DATI PERSONALI
      // ----------------------------------------------------------------------

      await loadLogs(
        userId
      )

      await loadUser(
        userId
      )

      // ----------------------------------------------------------------------
      // CONFIGURAZIONE PAGINA VACANZA
      // ----------------------------------------------------------------------

      /*
       * vacanza_attiva controlla la visibilità
       * della voce "Vacanza" nel menu.
       *
       * Questo sistema verrà successivamente
       * sostituito dalla gestione delle sessioni
       * direttamente dall'Admin.
       */
      const {
        data: config
      } =
        await supabase
          .from(
            TABLES.appConfig
          )
          .select('*')
          .eq(
            'key',
            'vacanza_attiva'
          )
          .single()

      setVacanzaAttiva(
        config?.value ||
        false
      )
    }

    loadAll()
  }, [
    router,
    isLimbo
  ])

  // ==========================================================================
  // DATI DERIVATI
  // ==========================================================================

  /*
   * Trasformiamo i log nel formato
   * richiesto dall'algoritmo BAC.
   */
  const bacDrinks =
    buildBACDrinks()

  /*
   * BAC corrente.
   */
  const bac =
    user
      ? calculateBAC(
        {
          weightKg:
            user.peso_kg,

          heightCm:
            user.altezza_cm
        },
        bacDrinks
      )
      : 0

  /*
   * Stato utilizzato per scegliere la frase.
   */
  const stato =
    getState(bac)

  const fraseCorrente =
    getPhrase(stato)

  /*
   * Stato utilizzato invece
   * dalla card BAC.
   */
  const bacVisualState =
    getBACVisualState(
      bac
    )

  /*
   * Stima del ritorno a BAC zero.
   */
  const soberText =
    getSoberCountdown(
      bac
    )

  // ==========================================================================
  // POSIZIONE DEL PALLINO SULLA SCALA BAC
  // ==========================================================================

  /*
   * La scala visiva va da:
   *
   *     0 -> 3.0
   *
   * Qualunque valore superiore viene bloccato
   * all'estremità destra.
   */
  const BAC_SCALE_MAX =
    3

  const bacMarkerPosition =
    Math.min(
      100,
      Math.max(
        0,
        (
          bac /
          BAC_SCALE_MAX
        ) *
        100
      )
    )

  // ==========================================================================
  // ULTIME 10 BEVUTE
  // ==========================================================================

  /*
   * Nella V1 mostravamo soltanto
   * le ultime 5 bevute.
   *
   * Dopo l'utilizzo reale abbiamo deciso
   * di portarle a 10.
   */
  const displayedLogs =
    useMemo(
      () =>
        logs.slice(
          0,
          10
        ),
      [logs]
    )

  // ==========================================================================
  // GIORNATA 08:00 -> 08:00
  // ==========================================================================

  /*
   * La "giornata alcolica" non termina
   * a mezzanotte.
   *
   * Va:
   *
   *     08:00
   *       ->
   *     08:00 del giorno successivo
   *
   * Questo permette alle bevute fatte durante
   * la notte di appartenere alla serata corretta.
   */
  function getDayStart(
    now = new Date()
  ) {
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

    /*
     * Se siamo prima delle 08:00
     * apparteniamo ancora alla giornata precedente.
     */
    if (
      current.getHours() <
      8
    ) {
      start.setDate(
        start.getDate() -
        1
      )
    }

    return start
  }

  // ==========================================================================
  // AGGIORNAMENTO PICCO BAC
  // ==========================================================================

  /*
   * Ogni volta che viene inserita una bevuta,
   * ricalcoliamo il BAC corrente.
   *
   * Se è superiore al massimo già registrato
   * per quella giornata, aggiorniamo:
   *
   *     daily_bac_peaks
   */
  async function updateDailyBacPeak(
    userId,
    updatedLogs
  ) {
    /*
     * Senza dati utente non possiamo
     * calcolare correttamente il BAC.
     */
    if (!user) {
      return
    }

    /*
     * Convertiamo i log nel formato
     * dell'algoritmo BAC.
     */
    const bacDrinks =
      updatedLogs
        .map(
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

            if (!drink) {
              return null
            }

            return {
              volumeMl:
                drink.volume_ml,

              abv:
                drink.perc_alc,

              timestamp:
                new Date(
                  log.created_at
                ).getTime()
            }
          }
        )
        .filter(
          Boolean
        )

    /*
     * BAC corrente dopo la nuova bevuta.
     */
    const currentBac =
      calculateBAC(
        {
          weightKg:
            user.peso_kg,

          heightCm:
            user.altezza_cm
        },
        bacDrinks
      )

    const now =
      new Date()

    /*
     * Giorno 08:00 -> 08:00.
     */
    const dayStart =
      getDayStart(
        now
      ).toISOString()

    /*
     * Cerchiamo il picco eventualmente
     * già presente.
     */
    const {
      data: existingPeak
    } =
      await supabase
        .from(
          TABLES.dailyBacPeaks
        )
        .select('*')
        .eq(
          'user_id',
          userId
        )
        .eq(
          'day_start',
          dayStart
        )
        .maybeSingle()

    /*
     * Nessun record:
     * creiamo il primo picco della giornata.
     */
    if (!existingPeak) {
      await supabase
        .from(
          TABLES.dailyBacPeaks
        )
        .insert({
          user_id:
            userId,

          day_start:
            dayStart,

          peak_bac:
            currentBac,

          peak_time:
            now.toISOString()
        })

      return
    }

    /*
     * Record già esistente:
     * aggiorniamo solamente se il nuovo BAC
     * supera il massimo precedente.
     */
    if (
      currentBac >
      Number(
        existingPeak.peak_bac ||
        0
      )
    ) {
      await supabase
        .from(
          TABLES.dailyBacPeaks
        )
        .update({
          peak_bac:
            currentBac,

          peak_time:
            now.toISOString()
        })
        .eq(
          'id',
          existingPeak.id
        )
    }
  }

  // ==========================================================================
  // INSERIMENTO BEVUTA
  // ==========================================================================

  /*
   * Viene chiamata quando l'utente
   * preme uno dei pulsanti drink.
   */
  async function handleDrinkClick(
    drinkId
  ) {
    const userId =
      localStorage.getItem(
        'user_id'
      )

    if (!userId) {
      return
    }

    /*
     * Salviamo la nuova bevuta
     * nel dataset corrente.
     */
    await supabase
      .from(
        TABLES.drinkLogs
      )
      .insert({
        user_id:
          userId,

        drink_id:
          drinkId
      })

    /*
     * Feedback aptico sui dispositivi compatibili.
     */
    if (
      navigator.vibrate
    ) {
      navigator.vibrate(
        35
      )
    }

    /*
     * Ricarichiamo immediatamente
     * tutte le bevute dell'utente.
     */
    const {
      data: updatedLogs
    } =
      await supabase
        .from(
          TABLES.drinkLogs
        )
        .select('*')
        .eq(
          'user_id',
          userId
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )

    setLogs(
      updatedLogs ||
      []
    )

    /*
     * Verifichiamo se abbiamo
     * stabilito un nuovo picco BAC.
     */
    await updateDailyBacPeak(
      userId,
      updatedLogs ||
      []
    )
  }

  // ==========================================================================
  // ANNULLA ULTIMA BEVUTA
  // ==========================================================================

  /*
   * Cancella l'ultima bevuta
   * registrata dall'utente.
   */
  async function handleUndo() {
    if (
      logs.length ===
      0
    ) {
      return
    }

    await supabase
      .from(
        TABLES.drinkLogs
      )
      .delete()
      .eq(
        'id',
        logs[0].id
      )

    const userId =
      localStorage.getItem(
        'user_id'
      )

    /*
     * Ricarichiamo lo storico.
     */
    await loadLogs(
      userId
    )
  }

  // ==========================================================================
  // CAMBIO UTENTE
  // ==========================================================================

  /*
   * Rimuove l'utente attualmente salvato
   * dal browser e torna alla pagina iniziale.
   */
  function handleSwitchUser() {
    const confirmed =
      window.confirm(
        'Non cambiare utente se non necessario.\n\nSei sicuro di voler continuare? Potresti creare confusione nei test o nei dati salvati.'
      )

    if (!confirmed) {
      return
    }

    localStorage.removeItem(
      'user_id'
    )

    setMenuOpen(false)

    router.push('/')
  }

  // ==========================================================================
  // LIMBO: NON MOSTRARE LA HOME NORMALE
  // ==========================================================================

  /*
   * Il redirect del useEffect avviene
   * dopo il primo render React.
   *
   * Senza questo controllo potrebbe comparire
   * per un istante la Home normale prima
   * dell'apertura di /standby.
   *
   * Restituendo null non mostriamo nulla
   * durante quel brevissimo intervallo.
   */
  if (isLimbo) {
    return null
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

      {/* ================================================================
          HEADER
          ================================================================ */}

      <header
        className={
          styles.header
        }
      >
        <button
          className={
            styles.menuButton
          }
          onClick={() =>
            setMenuOpen(
              (prev) =>
                !prev
            )
          }
          aria-label="Apri menu"
        >
          ☰
        </button>

        {menuOpen && (
          <div
            className={
              styles.menuDropdown
            }
          >

            {/* ------------------------------------------------------------
                UTENTE ATTUALE
                ------------------------------------------------------------ */}

            <div
              className={
                styles.menuNickname
              }
            >
              {user
                ? user.nickname
                : 'Utente'}
            </div>

            <div
              className={
                styles.menuWarning
              }
            >
              Non cambiare utente se non necessario
            </div>

            {/* ------------------------------------------------------------
                CAMBIO UTENTE
                ------------------------------------------------------------ */}

            <button
              onClick={
                handleSwitchUser
              }
            >
              Cambia utente
            </button>

            {/* ------------------------------------------------------------
                GRUPPO
                ------------------------------------------------------------ */}

            <button
              onClick={() =>
                router.push(
                  '/group'
                )
              }
            >
              Gruppo
            </button>

            {/* ------------------------------------------------------------
                ARCHIVIO VACANZE
                ------------------------------------------------------------ */}

            <button
              onClick={() =>
                router.push(
                  '/vacanze'
                )
              }
            >
              Vecchie vacanze
            </button>

            {/* ------------------------------------------------------------
                VACANZA CORRENTE
                ------------------------------------------------------------ */}

            {vacanzaAttiva && (
              <button
                onClick={() =>
                  router.push(
                    '/vacanza'
                  )
                }
              >
                Vacanza
              </button>
            )}

            {/* ------------------------------------------------------------
                ADMIN
                ------------------------------------------------------------ */}

            <button
              onClick={() =>
                router.push(
                  '/admin'
                )
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

      <section
        className={
          styles.phraseSection
        }
      >
        <h1
          className={
            styles.phrase
          }
        >
          {fraseCorrente}
        </h1>

        <div
          className={
            styles.phraseAccent
          }
        />
      </section>

      {/* ================================================================
          CARD BAC
          ================================================================ */}

      <section
        className={
          styles.bacCard
        }
      >
        <div
          className={
            styles.bacHeader
          }
        >

          {/* ------------------------------------------------------------
              BAC CORRENTE
              ------------------------------------------------------------ */}

          <div>
            <div
              className={
                styles.bacLabel
              }
            >
              BAC ATTUALE
            </div>

            <div
              className={
                styles.bacValue
              }
            >
              {bac.toFixed(
                2
              )}
            </div>

            <div
              className={`${styles.bacStatus} ${bacVisualState.className}`}
            >
              <span
                className={
                  styles.statusDot
                }
              />

              {
                bacVisualState.label
              }
            </div>
          </div>

          {/* ------------------------------------------------------------
              STIMA RITORNO A ZERO
              ------------------------------------------------------------ */}

          <div
            className={
              styles.soberBox
            }
          >
            <span
              className={
                styles.soberIcon
              }
            >
              ◷
            </span>

            <div>
              <div
                className={
                  styles.soberLabel
                }
              >
                Ritorno a zero tra
              </div>

              <div
                className={
                  styles.soberValue
                }
              >
                {soberText}
              </div>
            </div>
          </div>

        </div>

        {/* --------------------------------------------------------------
            SCALA BAC
            -------------------------------------------------------------- */}

        <div
          className={
            styles.scaleWrapper
          }
        >
          <div
            className={
              styles.scale
            }
          >
            <div
              className={
                styles.scaleGradient
              }
            />

            {/* ----------------------------------------------------------
                INDICATORE BAC
                ---------------------------------------------------------- */}

            <div
              className={
                styles.scaleMarker
              }
              style={{
                left:
                  `${bacMarkerPosition}%`
              }}
            />
          </div>

          {/* ------------------------------------------------------------
              VALORI DI RIFERIMENTO
              ------------------------------------------------------------ */}

          <div
            className={
              styles.scaleLabels
            }
          >
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

      <section
        className={
          styles.drinksSection
        }
      >
        <h2
          className={
            styles.sectionTitle
          }
        >
          Aggiungi una bevuta
        </h2>

        {/* --------------------------------------------------------------
            PULSANTI DRINK
            -------------------------------------------------------------- */}

        <div
          className={
            styles.grid
          }
        >
          {drinks.map(
            (drink) => (
              <button
                key={
                  drink.id
                }
                className={
                  styles.drinkButton
                }
                onClick={() =>
                  handleDrinkClick(
                    drink.id
                  )
                }
              >

                {/* --------------------------------------------------------
                    EMOJI
                    -------------------------------------------------------- */}

                <span
                  className={
                    styles.drinkEmoji
                  }
                >
                  {
                    drink.emoji
                  }
                </span>

                {/* --------------------------------------------------------
                    NOME
                    -------------------------------------------------------- */}

                <span
                  className={
                    styles.drinkName
                  }
                >
                  {
                    drink.name
                  }
                </span>

                {/* --------------------------------------------------------
                    GRADAZIONE
                    -------------------------------------------------------- */}

                <span
                  className={
                    styles.drinkDetails
                  }
                >
                  {
                    drink.perc_alc
                  }%
                </span>

              </button>
            )
          )}
        </div>

        {/* --------------------------------------------------------------
            ANNULLA
            -------------------------------------------------------------- */}

        <button
          className={
            styles.undoButton
          }
          onClick={
            handleUndo
          }
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

      <section
        className={
          styles.logsSection
        }
      >
        <h2
          className={
            styles.sectionTitle
          }
        >
          Ultime bevute
        </h2>

        <div
          className={
            styles.logsList
          }
        >

          {/* --------------------------------------------------------------
              LOG PRESENTI
              -------------------------------------------------------------- */}

          {displayedLogs.map(
            (log) => {
              /*
               * drink_logs contiene solamente drink_id.
               *
               * Recuperiamo nome ed emoji dalla tabella drinks.
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

              return (
                <div
                  key={
                    log.id
                  }
                  className={
                    styles.logRow
                  }
                >

                  {/* ------------------------------------------------------
                      DRINK
                      ------------------------------------------------------ */}

                  <div
                    className={
                      styles.logDrink
                    }
                  >
                    <span
                      className={
                        styles.logEmoji
                      }
                    >
                      {
                        drink?.emoji
                      }
                    </span>

                    <span>
                      {
                        drink?.name
                      }
                    </span>
                  </div>

                  {/* ------------------------------------------------------
                      ORARIO
                      ------------------------------------------------------ */}

                  <span
                    className={
                      styles.logTime
                    }
                  >
                    {new Date(
                      log.created_at
                    ).toLocaleTimeString(
                      [],
                      {
                        hour:
                          '2-digit',

                        minute:
                          '2-digit'
                      }
                    )}
                  </span>

                </div>
              )
            }
          )}

          {/* --------------------------------------------------------------
              NESSUNA BEVUTA
              -------------------------------------------------------------- */}

          {displayedLogs.length ===
            0 && (
              <div
                className={
                  styles.emptyLogs
                }
              >
                Nessuna bevuta registrata
              </div>
            )}

        </div>
      </section>

    </main>
  )
}