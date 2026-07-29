'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import styles from './styles/form.module.css'

export default function Register() {
  const router = useRouter()

  const [nickname, setNickname] = useState('')
  const [peso, setPeso] = useState('')
  const [altezza, setAltezza] = useState('')
  const [warning, setWarning] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)

  function handlePesoChange(value) {
    setPeso(value)

    const pesoNum = Number(value)

    if (pesoNum > 80) {
      setWarning('Mannaggia era un peso piuma in confronto')
    } else if (pesoNum < 81) {
      setWarning('Troppo leggero per gli standard di Babbude')
    } else {
      setWarning('')
    }
  }

  async function handleSubmit() {
    if (!nickname) {
      alert('Inserisci il nickname')
      return
    }

    // Se non stiamo ancora creando un nuovo utente,
    // controlliamo se il nickname esiste.
    if (!isNewUser) {
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('id')
        .eq('nickname', nickname)
        .maybeSingle()

      if (error) {
        alert('Errore durante la ricerca utente')
        return
      }

      // Utente già esistente -> entra direttamente
      if (existingUser) {
        localStorage.setItem('user_id', existingUser.id)
        router.push('/home')
        return
      }

      // Utente nuovo -> mostro peso e altezza
      setIsNewUser(true)
      return
    }

    // Creazione nuovo utente
    if (!peso || !altezza) {
      alert('Compila peso e altezza')
      return
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        nickname: nickname,
        peso_kg: Number(peso),
        altezza_cm: Number(altezza)
      })
      .select()
      .single()

    if (insertError) {
      alert('Errore registrazione')
      return
    }

    localStorage.setItem('user_id', newUser.id)
    router.push('/home')
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Bastardi mussulmani, complletate i vostri dati</h1>

        <input
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className={styles.input}
        />

        {isNewUser && (
          <>
            <input
              placeholder="Peso (kg)"
              type="number"
              value={peso}
              onChange={(e) => handlePesoChange(e.target.value)}
              className={styles.input}
            />

            {warning && (
              <p style={{ color: '#ffaa00', textAlign: 'center' }}>
                {warning}
              </p>
            )}

            <input
              placeholder="Altezza (cm)"
              type="number"
              value={altezza}
              onChange={(e) => setAltezza(e.target.value)}
              className={styles.input}
            />
          </>
        )}

        <button onClick={handleSubmit} className={styles.button}>
          {isNewUser ? 'Crea account' : 'Continua'}
        </button>
      </div>
    </main>
  )
}