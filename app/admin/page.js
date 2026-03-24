'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from '../styles/form.module.css'
import { useRouter } from 'next/navigation'

export default function Admin() {
    const [inputPassword, setInputPassword] = useState('')
    const [isLogged, setIsLogged] = useState(false)
    const [error, setError] = useState('')
    const [tab, setTab] = useState('drinks')
    const router = useRouter()

    const [drinks, setDrinks] = useState([])
    const [phrases, setPhrases] = useState([])
    const [vacanzaAttiva, setVacanzaAttiva] = useState(false)

    const [newDrink, setNewDrink] = useState({
        name: '',
        emoji: '',
        volume_ml: '',
        perc_alc: '',
        category: 'beer',
        is_active: true
    })

    const [newPhrase, setNewPhrase] = useState({
        category: 'SOBRIO',
        text: '',
        is_active: true
    })

    const ADMIN_PASSWORD = '1234'


    function handleLogin() {
        if (inputPassword === ADMIN_PASSWORD) {
            setIsLogged(true)
            setError('')
        } else {
            setError('Password errata')
        }
    }

    async function loadDrinks() {
        const { data } = await supabase
            .from('drinks')
            .select('*')
            .order('id', { ascending: true })

        setDrinks(data || [])
    }

    async function loadPhrases() {
        const { data } = await supabase
            .from('phrases')
            .select('*')
            .order('id', { ascending: true })

        setPhrases(data || [])
    }

    useEffect(() => {
        if (!isLogged) return

        async function load() {
            await loadDrinks()
            await loadPhrases()

            const { data: config } = await supabase
                .from('app_config')
                .select('*')
                .eq('key', 'vacanza_attiva')
                .single()

            setVacanzaAttiva(config?.value || false)
        }

        load()
    }, [isLogged])

    function updateDrinkField(id, field, value) {
        setDrinks((prev) =>
            prev.map((drink) =>
                drink.id === id ? { ...drink, [field]: value } : drink
            )
        )
    }

    async function saveDrink(drink) {
        await supabase
            .from('drinks')
            .update({
                name: drink.name,
                emoji: drink.emoji,
                volume_ml: Number(drink.volume_ml),
                perc_alc: Number(drink.perc_alc),
                category: drink.category,
                is_active: drink.is_active
            })
            .eq('id', drink.id)

        loadDrinks()
    }

    async function toggleDrink(drink) {
        await supabase
            .from('drinks')
            .update({ is_active: !drink.is_active })
            .eq('id', drink.id)

        loadDrinks()
    }

    async function addDrink() {
        if (
            !newDrink.name ||
            !newDrink.emoji ||
            !newDrink.volume_ml ||
            !newDrink.perc_alc ||
            !newDrink.category
        ) {
            alert('Compila tutti i campi del drink')
            return
        }

        await supabase.from('drinks').insert({
            name: newDrink.name,
            emoji: newDrink.emoji,
            volume_ml: Number(newDrink.volume_ml),
            perc_alc: Number(newDrink.perc_alc),
            category: newDrink.category,
            is_active: true
        })

        setNewDrink({
            name: '',
            emoji: '',
            volume_ml: '',
            perc_alc: '',
            category: 'beer',
            is_active: true
        })

        loadDrinks()
    }

    function updatePhraseField(id, field, value) {
        setPhrases((prev) =>
            prev.map((phrase) =>
                phrase.id === id ? { ...phrase, [field]: value } : phrase
            )
        )
    }

    async function savePhrase(phrase) {
        await supabase
            .from('phrases')
            .update({
                category: phrase.category,
                text: phrase.text,
                is_active: phrase.is_active
            })
            .eq('id', phrase.id)

        loadPhrases()
    }

    async function togglePhrase(phrase) {
        await supabase
            .from('phrases')
            .update({ is_active: !phrase.is_active })
            .eq('id', phrase.id)

        loadPhrases()
    }

    async function addPhrase() {
        if (!newPhrase.category || !newPhrase.text) {
            alert('Compila tutti i campi della frase')
            return
        }

        await supabase.from('phrases').insert({
            category: newPhrase.category,
            text: newPhrase.text,
            is_active: true
        })

        setNewPhrase({
            category: 'SOBRIO',
            text: '',
            is_active: true
        })

        loadPhrases()
    }
    async function toggleVacanza() {
        const newValue = !vacanzaAttiva

        await supabase
            .from('app_config')
            .update({ value: newValue })
            .eq('key', 'vacanza_attiva')

        setVacanzaAttiva(newValue)
    }

    if (!isLogged) {
        return (
            <main className={styles.page}>
                <div className={styles.card}>
                    <h1 className={styles.title}>Admin</h1>
                    <button
                        className={styles.button}
                        onClick={() => router.push('/home')}
                        style={{ marginBottom: '10px' }}
                    >
                        ← Torna alla Home
                    </button>

                    <input
                        type="password"
                        placeholder="Inserisci password"
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        className={styles.input}
                    />

                    <button onClick={handleLogin} className={styles.button}>
                        Conferma
                    </button>

                    {error && (
                        <p style={{ color: '#ff4d4d', textAlign: 'center' }}>{error}</p>
                    )}
                </div>
            </main>
        )
    }

    return (
        <main className={styles.page}>
            <div
                className={styles.card}
                style={{ maxWidth: '900px', width: '95%', alignItems: 'stretch' }}
            >
                <h1 className={styles.title}>Admin Panel</h1>
                <button
                    className={styles.button}
                    onClick={() => router.push('/home')}
                    style={{ marginBottom: '10px' }}
                >
                    ← Torna alla Home
                </button>
                <div style={{ marginBottom: '20px' }}>
                    <button onClick={toggleVacanza} className={styles.button}>
                        Vacanza: {vacanzaAttiva ? 'ATTIVA 🟢' : 'DISATTIVA 🔴'}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className={styles.button}
                        onClick={() => setTab('drinks')}
                        style={{ opacity: tab === 'drinks' ? 1 : 0.6 }}
                    >
                        Drink
                    </button>

                    <button
                        className={styles.button}
                        onClick={() => setTab('phrases')}
                        style={{ opacity: tab === 'phrases' ? 1 : 0.6 }}
                    >
                        Frasi
                    </button>
                </div>

                {tab === 'drinks' && (
                    <>
                        <h2 style={{ marginTop: '8px' }}>Aggiungi drink</h2>

                        <input
                            className={styles.input}
                            placeholder="Nome"
                            value={newDrink.name}
                            onChange={(e) =>
                                setNewDrink({ ...newDrink, name: e.target.value })
                            }
                        />

                        <input
                            className={styles.input}
                            placeholder="Emoji"
                            value={newDrink.emoji}
                            onChange={(e) =>
                                setNewDrink({ ...newDrink, emoji: e.target.value })
                            }
                        />

                        <input
                            className={styles.input}
                            placeholder="Volume ml"
                            type="number"
                            value={newDrink.volume_ml}
                            onChange={(e) =>
                                setNewDrink({ ...newDrink, volume_ml: e.target.value })
                            }
                        />

                        <input
                            className={styles.input}
                            placeholder="Percentuale alcol"
                            type="number"
                            value={newDrink.perc_alc}
                            onChange={(e) =>
                                setNewDrink({ ...newDrink, perc_alc: e.target.value })
                            }
                        />

                        <select
                            className={styles.input}
                            value={newDrink.category}
                            onChange={(e) =>
                                setNewDrink({ ...newDrink, category: e.target.value })
                            }
                        >
                            <option value="beer">beer</option>
                            <option value="cocktail">cocktail</option>
                            <option value="shot">shot</option>
                        </select>

                        <button className={styles.button} onClick={addDrink}>
                            Aggiungi drink
                        </button>

                        <h2 style={{ marginTop: '16px' }}>Drink esistenti</h2>

                        {drinks.map((drink) => (
                            <div
                                key={drink.id}
                                style={{
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}
                            >
                                <input
                                    className={styles.input}
                                    value={drink.name}
                                    onChange={(e) =>
                                        updateDrinkField(drink.id, 'name', e.target.value)
                                    }
                                />

                                <input
                                    className={styles.input}
                                    value={drink.emoji || ''}
                                    onChange={(e) =>
                                        updateDrinkField(drink.id, 'emoji', e.target.value)
                                    }
                                />

                                <input
                                    className={styles.input}
                                    type="number"
                                    value={drink.volume_ml}
                                    onChange={(e) =>
                                        updateDrinkField(drink.id, 'volume_ml', e.target.value)
                                    }
                                />

                                <input
                                    className={styles.input}
                                    type="number"
                                    value={drink.perc_alc}
                                    onChange={(e) =>
                                        updateDrinkField(drink.id, 'perc_alc', e.target.value)
                                    }
                                />

                                <select
                                    className={styles.input}
                                    value={drink.category || 'beer'}
                                    onChange={(e) =>
                                        updateDrinkField(drink.id, 'category', e.target.value)
                                    }
                                >
                                    <option value="beer">beer</option>
                                    <option value="cocktail">cocktail</option>
                                    <option value="shot">shot</option>
                                </select>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        className={styles.button}
                                        onClick={() => saveDrink(drink)}
                                    >
                                        Salva
                                    </button>

                                    <button
                                        className={styles.button}
                                        onClick={() => toggleDrink(drink)}
                                    >
                                        {drink.is_active ? 'Disattiva' : 'Attiva'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {tab === 'phrases' && (
                    <>
                        <h2 style={{ marginTop: '8px' }}>Aggiungi frase</h2>

                        <select
                            className={styles.input}
                            value={newPhrase.category}
                            onChange={(e) =>
                                setNewPhrase({ ...newPhrase, category: e.target.value })
                            }
                        >
                            <option value="SOBRIO">SOBRIO</option>
                            <option value="MEDIO BAC">MEDIO BAC</option>
                            <option value="ALTO BAC">ALTO BAC</option>
                            <option value="LEGGENDA">LEGGENDA</option>
                            <option value="BIRRA">BIRRA</option>
                            <option value="COCKTAIL">COCKTAIL</option>
                        </select>

                        <input
                            className={styles.input}
                            placeholder="Testo frase"
                            value={newPhrase.text}
                            onChange={(e) =>
                                setNewPhrase({ ...newPhrase, text: e.target.value })
                            }
                        />

                        <button className={styles.button} onClick={addPhrase}>
                            Aggiungi frase
                        </button>

                        <h2 style={{ marginTop: '16px' }}>Frasi esistenti</h2>

                        {phrases.map((phrase) => (
                            <div
                                key={phrase.id}
                                style={{
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}
                            >
                                <select
                                    className={styles.input}
                                    value={phrase.category}
                                    onChange={(e) =>
                                        updatePhraseField(phrase.id, 'category', e.target.value)
                                    }
                                >
                                    <option value="SOBRIO">SOBRIO</option>
                                    <option value="MEDIO BAC">MEDIO BAC</option>
                                    <option value="ALTO BAC">ALTO BAC</option>
                                    <option value="LEGGENDA">LEGGENDA</option>
                                    <option value="BIRRA">BIRRA</option>
                                    <option value="COCKTAIL">COCKTAIL</option>
                                </select>

                                <input
                                    className={styles.input}
                                    value={phrase.text}
                                    onChange={(e) =>
                                        updatePhraseField(phrase.id, 'text', e.target.value)
                                    }
                                />

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        className={styles.button}
                                        onClick={() => savePhrase(phrase)}
                                    >
                                        Salva
                                    </button>

                                    <button
                                        className={styles.button}
                                        onClick={() => togglePhrase(phrase)}
                                    >
                                        {phrase.is_active ? 'Disattiva' : 'Attiva'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </main>
    )
}