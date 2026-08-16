'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/tableNames'
import styles from './styles/form.module.css'

/*
===============================================================================
PAGINA REGISTRAZIONE / ACCESSO UTENTE
===============================================================================

Questa è la prima pagina che viene mostrata quando un dispositivo
non ha ancora un user_id salvato nel localStorage.

La pagina gestisce due situazioni:

1. UTENTE GIÀ ESISTENTE
   - Inserisce il nickname.
   - Cerchiamo il nickname nel database.
   - Se esiste, salviamo il suo id nel localStorage.
   - Entriamo direttamente nella Home.

2. NUOVO UTENTE
   - Inserisce inizialmente solo il nickname.
   - Se il nickname non esiste, mostriamo anche:
       - peso
       - altezza
   - Creiamo il nuovo utente nel database.
   - Salviamo il suo id nel localStorage.
   - Entriamo nella Home.

IMPORTANTE - SISTEMA VACANZE / TEST:

La tabella utenti NON viene più indicata direttamente con:

    .from('users')

ma viene recuperata da:

    TABLES.users

Il nome effettivo della tabella viene deciso in:

    lib/tableNames.js

Questo significa che, quando ACTIVE_DATASET sarà "test",
questa pagina cercherà e creerà utenti dentro:

    users_test

Quando invece leggeremo Creta 2026 useremo:

    users_creta_2026

In questo modo peso, altezza e dati personali rimangono
legati alla singola vacanza e non modificano i dati storici.

===============================================================================
*/

export default function Register() {
  const router = useRouter()

  // ==========================================================================
  // STATO DEL FORM
  // ==========================================================================

  /*
   * Nickname inserito dall'utente.
   *
   * È l'unico dato richiesto nella prima fase.
   */
  const [nickname, setNickname] = useState('')

  /*
   * Peso e altezza vengono richiesti solamente
   * quando scopriamo che il nickname non esiste ancora.
   */
  const [peso, setPeso] = useState('')
  const [altezza, setAltezza] = useState('')

  /*
   * Messaggio scherzoso mostrato in base al peso inserito.
   */
  const [warning, setWarning] = useState('')

  /*
   * false:
   * siamo nella prima fase e stiamo cercando di capire
   * se il nickname appartiene a un utente già esistente.
   *
   * true:
   * il nickname non esiste e stiamo completando
   * la registrazione di un nuovo utente.
   */
  const [isNewUser, setIsNewUser] = useState(false)

  // ==========================================================================
  // GESTIONE CAMBIO PESO
  // ==========================================================================

  /*
   * Aggiorna il peso inserito e genera il messaggio scherzoso.
   *
   * Il valore dell'input arriva come stringa, quindi lo convertiamo
   * temporaneamente in Number per effettuare il confronto.
   */
  function handlePesoChange(value) {
    setPeso(value)

    const pesoNum = Number(value)

    /*
     * Messaggi puramente grafici/divertenti.
     * Non modificano in nessun modo i calcoli o il database.
     */
    if (pesoNum > 80) {
      setWarning('Mannaggia era un peso piuma in confronto')
    } else if (pesoNum < 81) {
      setWarning('Troppo leggero per gli standard di Babbude')
    } else {
      setWarning('')
    }
  }

  // ==========================================================================
  // INVIO FORM
  // ==========================================================================

  /*
   * handleSubmit gestisce entrambe le fasi:
   *
   * FASE 1
   * -------
   * controlla se il nickname esiste.
   *
   * Se esiste:
   *     -> login immediato.
   *
   * Se non esiste:
   *     -> mostra peso e altezza.
   *
   *
   * FASE 2
   * -------
   * crea il nuovo utente con:
   *     - nickname
   *     - peso
   *     - altezza
   *
   * e successivamente entra nella Home.
   */
  async function handleSubmit() {
    // ------------------------------------------------------------------------
    // CONTROLLO NICKNAME
    // ------------------------------------------------------------------------

    if (!nickname) {
      alert('Inserisci il nickname')
      return
    }

    // =========================================================================
    // FASE 1 - CERCA UTENTE ESISTENTE
    // =========================================================================

    /*
     * Se isNewUser è ancora false significa che l'utente
     * ha inserito solamente il nickname.
     *
     * Cerchiamo quindi quel nickname nella tabella utenti
     * dell'ambiente attualmente attivo.
     */
    if (!isNewUser) {
      const { data: existingUser, error } = await supabase
        .from(TABLES.users)
        .select('id')
        .eq('nickname', nickname)
        .maybeSingle()

      /*
       * Se Supabase restituisce un errore interrompiamo
       * il flusso senza modificare localStorage.
       */
      if (error) {
        alert('Errore durante la ricerca utente')
        return
      }

      // ----------------------------------------------------------------------
      // UTENTE GIÀ ESISTENTE
      // ----------------------------------------------------------------------

      /*
       * Se troviamo il nickname significa che l'utente
       * è già registrato per questa vacanza/sessione.
       *
       * Salviamo il suo id nel browser.
       *
       * Da questo momento le altre pagine potranno recuperarlo con:
       *
       *     localStorage.getItem('user_id')
       */
      if (existingUser) {
        localStorage.setItem('user_id', existingUser.id)

        // Entriamo nella Home.
        router.push('/home')
        return
      }

      // ----------------------------------------------------------------------
      // NUOVO UTENTE
      // ----------------------------------------------------------------------

      /*
       * Il nickname non esiste.
       *
       * NON creiamo ancora l'utente.
       *
       * Passiamo alla seconda fase della registrazione,
       * facendo comparire i campi peso e altezza.
       */
      setIsNewUser(true)
      return
    }

    // =========================================================================
    // FASE 2 - CREAZIONE NUOVO UTENTE
    // =========================================================================

    /*
     * Ora peso e altezza sono obbligatori perché questi dati
     * vengono utilizzati successivamente nel calcolo BAC
     * e nelle statistiche relative al peso.
     */
    if (!peso || !altezza) {
      alert('Compila peso e altezza')
      return
    }

    /*
     * Inseriamo il nuovo utente nella tabella configurata
     * attraverso TABLES.users.
     *
     * Quando saremo in modalità TEST sarà:
     *
     *     users_test
     *
     * e quindi i nuovi utenti creati durante lo sviluppo
     * non finiranno nell'archivio di Creta 2026.
     */
    const { data: newUser, error: insertError } = await supabase
      .from(TABLES.users)
      .insert({
        nickname: nickname,
        peso_kg: Number(peso),
        altezza_cm: Number(altezza)
      })
      .select()
      .single()

    // Errore durante la creazione dell'utente.
    if (insertError) {
      console.error('Errore registrazione utente:', insertError)
      alert(`Errore registrazione: ${insertError.message}`)
      return
    }

    /*
     * Registrazione completata.
     *
     * Salviamo nel browser l'id assegnato da Supabase.
     */
    localStorage.setItem('user_id', newUser.id)

    // Entriamo nella Home.
    router.push('/home')
  }

  // ==========================================================================
  // INTERFACCIA
  // ==========================================================================

  return (
    <main className={styles.page}>
      <div className={styles.card}>

        {/* ================================================================
            TITOLO
            ================================================================

            Il testo cambia tra:
            - fase iniziale
            - completamento nuovo profilo
            ================================================================ */}

        <h1 className={styles.title}>
          {isNewUser
            ? 'Completate i dati, brutti Froci '
            : 'Benvenuti mussulmani'}
        </h1>

        {/* ================================================================
            NICKNAME
            ================================================================

            Il nickname è sempre visibile,
            sia per utenti esistenti sia per nuovi utenti.
            ================================================================ */}

        <input
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className={styles.input}
        />

        {/* ================================================================
            DATI NUOVO UTENTE
            ================================================================

            Peso e altezza vengono mostrati solamente quando
            abbiamo già verificato che il nickname non esiste.
            ================================================================ */}

        {isNewUser && (
          <>
            {/* Peso dell'utente in kg */}
            <input
              placeholder="Peso (kg)"
              type="number"
              value={peso}
              onChange={(e) => handlePesoChange(e.target.value)}
              className={styles.input}
            />

            {/* Messaggio scherzoso relativo al peso inserito */}
            {warning && (
              <p
                style={{
                  color: '#ffaa00',
                  textAlign: 'center'
                }}
              >
                {warning}
              </p>
            )}

            {/* Altezza dell'utente in centimetri */}
            <input
              placeholder="Altezza (cm)"
              type="number"
              value={altezza}
              onChange={(e) => setAltezza(e.target.value)}
              className={styles.input}
            />
          </>
        )}

        {/* ================================================================
            PULSANTE PRINCIPALE
            ================================================================

            Prima fase:
                "Continua"

            Seconda fase:
                "Crea account"
            ================================================================ */}

        <button
          onClick={handleSubmit}
          className={styles.button}
        >
          {isNewUser ? 'Crea account' : 'Continua'}
        </button>
      </div>
    </main>
  )
}