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
    if (!nickname || !peso || !altezza) {
      alert('Compila tutti i campi')
      return
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        nickname: nickname,
        peso_kg: Number(peso),
        altezza_cm: Number(altezza)
      })
      .select()
      .single()

    if (error) {
      alert('Errore registrazione')
      return
    }

    localStorage.setItem('user_id', data.id)
    router.push('/home')
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Registrazione</h1>

        <input
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className={styles.input}
        />

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

        <button onClick={handleSubmit} className={styles.button}>
          Continua
        </button>
      </div>
    </main>
  )
}