'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

import {
  TABLES,
  getVacationTables
} from '../lib/tableNames'

import styles from './styles/form.module.css'

export default function Register() {
  const router = useRouter()

  // ==========================================================================
  // SESSIONE ATTIVA
  // ==========================================================================

  const [sessionTables, setSessionTables] = useState(null)
  const [sessionResolved, setSessionResolved] = useState(false)

  // ==========================================================================
  // STATO DEL FORM
  // ==========================================================================

  const [nickname, setNickname] = useState('')
  const [peso, setPeso] = useState('')
  const [altezza, setAltezza] = useState('')
  const [warning, setWarning] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)

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

      if (cancelled) {
        return
      }

      const slug =
        config?.text_value
          ?.trim()

      /*
       * Nessuna sessione attiva:
       * l'app è in standby.
       */
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

        router.replace(
          '/standby'
        )

        return
      }

      /*
       * Esempio:
       *
       * test_sessione
       *
       * ->
       *
       * users_test_sessione
       * drink_logs_test_sessione
       * daily_bac_peaks_test_sessione
       */
      const tables =
        getVacationTables(
          slug
        )

      setSessionTables(
        tables
      )

      setSessionResolved(
        true
      )
    }

    resolveActiveSession()

    return () => {
      cancelled = true
    }
  }, [router])

  // ==========================================================================
  // GESTIONE CAMBIO PESO
  // ==========================================================================

  function handlePesoChange(
    value
  ) {
    setPeso(value)

    const pesoNum =
      Number(value)

    if (pesoNum > 80) {
      setWarning(
        'Mannaggia era un peso piuma in confronto'
      )
    } else if (
      pesoNum < 81
    ) {
      setWarning(
        'Troppo leggero per gli standard di Babbude'
      )
    } else {
      setWarning('')
    }
  }

  // ==========================================================================
  // INVIO FORM
  // ==========================================================================

  async function handleSubmit() {
    if (!sessionTables) {
      return
    }

    // ------------------------------------------------------------------------
    // CONTROLLO NICKNAME
    // ------------------------------------------------------------------------

    if (!nickname) {
      alert(
        'Inserisci il nickname'
      )

      return
    }

    // =========================================================================
    // FASE 1 - CERCA UTENTE ESISTENTE
    // =========================================================================

    if (!isNewUser) {
      const {
        data: existingUser,
        error
      } =
        await supabase
          .from(
            sessionTables.users
          )
          .select('id')
          .eq(
            'nickname',
            nickname
          )
          .maybeSingle()

      if (error) {
        console.error(
          'Errore ricerca utente:',
          error
        )

        alert(
          'Errore durante la ricerca utente'
        )

        return
      }

      // ----------------------------------------------------------------------
      // UTENTE GIÀ ESISTENTE
      // ----------------------------------------------------------------------

      if (existingUser) {
        localStorage.setItem(
          'user_id',
          existingUser.id
        )

        router.push(
          '/home'
        )

        return
      }

      // ----------------------------------------------------------------------
      // NUOVO UTENTE
      // ----------------------------------------------------------------------

      setIsNewUser(
        true
      )

      return
    }

    // =========================================================================
    // FASE 2 - CREAZIONE NUOVO UTENTE
    // =========================================================================

    if (
      !peso ||
      !altezza
    ) {
      alert(
        'Compila peso e altezza'
      )

      return
    }

    const {
      data: newUser,
      error: insertError
    } =
      await supabase
        .from(
          sessionTables.users
        )
        .insert({
          nickname:
            nickname,

          peso_kg:
            Number(
              peso
            ),

          altezza_cm:
            Number(
              altezza
            )
        })
        .select()
        .single()

    if (insertError) {
      console.error(
        'Errore registrazione utente:',
        insertError
      )

      alert(
        `Errore registrazione: ${insertError.message}`
      )

      return
    }

    // ------------------------------------------------------------------------
    // REGISTRAZIONE COMPLETATA
    // ------------------------------------------------------------------------

    localStorage.setItem(
      'user_id',
      newUser.id
    )

    router.push(
      '/home'
    )
  }

  // ==========================================================================
  // ATTESA SESSIONE
  // ==========================================================================

  if (
    !sessionResolved ||
    !sessionTables
  ) {
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
      <div
        className={
          styles.card
        }
      >

        <h1
          className={
            styles.title
          }
        >
          {isNewUser
            ? 'Completate i dati, brutti Froci '
            : 'Benvenuti mussulmani'}
        </h1>

        <input
          placeholder="Nickname"
          value={
            nickname
          }
          onChange={(e) =>
            setNickname(
              e.target.value
            )
          }
          className={
            styles.input
          }
        />

        {isNewUser && (
          <>
            <input
              placeholder="Peso (kg)"
              type="number"
              value={
                peso
              }
              onChange={(e) =>
                handlePesoChange(
                  e.target.value
                )
              }
              className={
                styles.input
              }
            />

            {warning && (
              <p
                style={{
                  color:
                    '#ffaa00',

                  textAlign:
                    'center'
                }}
              >
                {warning}
              </p>
            )}

            <input
              placeholder="Altezza (cm)"
              type="number"
              value={
                altezza
              }
              onChange={(e) =>
                setAltezza(
                  e.target.value
                )
              }
              className={
                styles.input
              }
            />
          </>
        )}

        <button
          onClick={
            handleSubmit
          }
          className={
            styles.button
          }
        >
          {isNewUser
            ? 'Crea account'
            : 'Continua'}
        </button>

      </div>
    </main>
  )
}