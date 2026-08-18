'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { TABLES } from '../../lib/tableNames'
import styles from '../styles/form.module.css'

export default function Admin() {
    const router = useRouter()

    // =========================================================================
    // ACCESSO ADMIN
    // =========================================================================

    const [inputPassword, setInputPassword] = useState('')
    const [isLogged, setIsLogged] = useState(false)
    const [error, setError] = useState('')

    // =========================================================================
    // TAB
    // =========================================================================

    const [tab, setTab] = useState('drinks')

    // =========================================================================
    // DATI
    // =========================================================================

    const [drinks, setDrinks] = useState([])
    const [phrases, setPhrases] = useState([])
    const [vacanzaAttiva, setVacanzaAttiva] = useState(false)

    // =========================================================================
    // SESSIONI
    // =========================================================================

    const [vacations, setVacations] = useState([])

    const [newVacation, setNewVacation] = useState({
        title: '',
        slug: '',
        timezone: 'Europe/Rome',
        startAt: '',
        endAt: ''
    })

    const [sessionMessage, setSessionMessage] = useState('')
    const [creatingSession, setCreatingSession] = useState(false)

    // =========================================================================
    // FORM NUOVO DRINK
    // =========================================================================

    const [newDrink, setNewDrink] = useState({
        name: '',
        emoji: '',
        volume_ml: '',
        perc_alc: '',
        category: 'beer',
        is_active: true
    })

    // =========================================================================
    // FORM NUOVA FRASE
    // =========================================================================

    const [newPhrase, setNewPhrase] = useState({
        category: 'SOBRIO',
        text: '',
        is_active: true
    })

    // =========================================================================
    // PASSWORD ADMIN
    // =========================================================================

    const ADMIN_PASSWORD = '1234'

    function handleLogin() {
        if (inputPassword === ADMIN_PASSWORD) {
            setIsLogged(true)
            setError('')
        } else {
            setError('Password errata')
        }
    }

    // =========================================================================
    // CARICAMENTO DRINK
    // =========================================================================

    async function loadDrinks() {
        const { data } = await supabase
            .from(TABLES.drinks)
            .select('*')
            .order('id', { ascending: true })

        setDrinks(data || [])
    }

    // =========================================================================
    // CARICAMENTO FRASI
    // =========================================================================

    async function loadPhrases() {
        const { data } = await supabase
            .from(TABLES.phrases)
            .select('*')
            .order('id', { ascending: true })

        setPhrases(data || [])
    }

    // =========================================================================
    // CARICAMENTO SESSIONI
    // =========================================================================

    async function loadVacations() {
        const { data, error } = await supabase
            .from('vacations')
            .select('*')
            .order('created_at', {
                ascending: false
            })

        if (error) {
            console.error(
                'Errore caricamento sessioni:',
                error
            )

            return
        }

        setVacations(data || [])
    }

    // =========================================================================
    // CARICAMENTO INIZIALE
    // =========================================================================

    useEffect(() => {
        if (!isLogged) return

        async function load() {
            await loadDrinks()
            await loadPhrases()
            await loadVacations()

            const { data: config } = await supabase
                .from(TABLES.appConfig)
                .select('*')
                .eq('key', 'vacanza_attiva')
                .single()

            setVacanzaAttiva(
                config?.value || false
            )
        }

        load()
    }, [isLogged])

    // =========================================================================
    // DRINK - MODIFICA LOCALE
    // =========================================================================

    function updateDrinkField(id, field, value) {
        setDrinks((prev) =>
            prev.map((drink) =>
                drink.id === id
                    ? {
                        ...drink,
                        [field]: value
                    }
                    : drink
            )
        )
    }

    // =========================================================================
    // DRINK - SALVA
    // =========================================================================

    async function saveDrink(drink) {
        await supabase
            .from(TABLES.drinks)
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

    // =========================================================================
    // DRINK - ATTIVA / DISATTIVA
    // =========================================================================

    async function toggleDrink(drink) {
        await supabase
            .from(TABLES.drinks)
            .update({
                is_active: !drink.is_active
            })
            .eq('id', drink.id)

        loadDrinks()
    }

    // =========================================================================
    // DRINK - AGGIUNGI
    // =========================================================================

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

        await supabase
            .from(TABLES.drinks)
            .insert({
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

    // =========================================================================
    // FRASI - MODIFICA LOCALE
    // =========================================================================

    function updatePhraseField(id, field, value) {
        setPhrases((prev) =>
            prev.map((phrase) =>
                phrase.id === id
                    ? {
                        ...phrase,
                        [field]: value
                    }
                    : phrase
            )
        )
    }

    // =========================================================================
    // FRASI - SALVA
    // =========================================================================

    async function savePhrase(phrase) {
        await supabase
            .from(TABLES.phrases)
            .update({
                category: phrase.category,
                text: phrase.text,
                is_active: phrase.is_active
            })
            .eq('id', phrase.id)

        loadPhrases()
    }

    // =========================================================================
    // FRASI - ATTIVA / DISATTIVA
    // =========================================================================

    async function togglePhrase(phrase) {
        await supabase
            .from(TABLES.phrases)
            .update({
                is_active: !phrase.is_active
            })
            .eq('id', phrase.id)

        loadPhrases()
    }

    // =========================================================================
    // FRASI - AGGIUNGI
    // =========================================================================

    async function addPhrase() {
        if (!newPhrase.category || !newPhrase.text) {
            alert('Compila tutti i campi della frase')
            return
        }

        await supabase
            .from(TABLES.phrases)
            .insert({
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

    // =========================================================================
    // SESSIONI - CREA
    // =========================================================================

    async function createVacation() {
        if (
            !newVacation.title ||
            !newVacation.slug
        ) {
            setSessionMessage(
                'Titolo e slug sono obbligatori.'
            )

            return
        }

        setCreatingSession(true)
        setSessionMessage('')

        try {
            const response = await fetch(
                '/api/admin/vacations/create',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': inputPassword
                    },

                    body: JSON.stringify({
                        title: newVacation.title,
                        slug: newVacation.slug,
                        timezone: newVacation.timezone,

                        startAt:
                            newVacation.startAt ||
                            null,

                        endAt:
                            newVacation.endAt ||
                            null
                    })
                }
            )

            const result =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    'Errore creazione sessione'
                )
            }

            setNewVacation({
                title: '',
                slug: '',
                timezone: 'Europe/Rome',
                startAt: '',
                endAt: ''
            })

            setSessionMessage(
                'Sessione creata correttamente ✓'
            )

            await loadVacations()

        } catch (error) {
            console.error(error)

            setSessionMessage(
                error.message
            )

        } finally {
            setCreatingSession(false)
        }
    }

    // =========================================================================
    // SESSIONI - ATTIVA
    // =========================================================================

    async function activateVacation(slug) {
        const confirmed = window.confirm(
            `Vuoi rendere attiva la sessione "${slug}"?`
        )

        if (!confirmed) return

        setSessionMessage(
            'Attivazione in corso...'
        )

        try {
            const response = await fetch(
                '/api/admin/vacations/activate',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',

                        'x-admin-password':
                            inputPassword
                    },

                    body: JSON.stringify({
                        slug
                    })
                }
            )

            const result =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    'Errore attivazione sessione'
                )
            }

            setSessionMessage(
                'Sessione attivata correttamente ✓'
            )

            await loadVacations()

            /*
             * Aggiorniamo anche lo stato del vecchio
             * flag mostrato in alto nell'Admin.
             */
            setVacanzaAttiva(true)

        } catch (error) {
            console.error(error)

            setSessionMessage(
                error.message
            )
        }
    }


    async function archiveVacation(slug) {
        const confirmed = window.confirm(
            `Vuoi davvero terminare e archiviare "${slug}"?\n\nL'app tornerà in modalità Standby.`
        )

        if (!confirmed) return

        setSessionMessage(
            'Archiviazione in corso...'
        )

        try {
            const response = await fetch(
                '/api/admin/vacations/archive',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': inputPassword
                    },

                    body: JSON.stringify({
                        slug
                    })
                }
            )

            const result =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    'Errore archiviazione sessione'
                )
            }

            setSessionMessage(
                'Sessione archiviata correttamente ✓'
            )

            setVacanzaAttiva(false)

            await loadVacations()

        } catch (error) {
            console.error(error)

            setSessionMessage(
                error.message
            )
        }
    }

    // =========================================================================
    // ATTIVA / DISATTIVA VACANZA
    // =========================================================================

    async function toggleVacanza() {
        const newValue =
            !vacanzaAttiva

        await supabase
            .from(TABLES.appConfig)
            .update({
                value: newValue
            })
            .eq(
                'key',
                'vacanza_attiva'
            )

        setVacanzaAttiva(
            newValue
        )
    }

    // =========================================================================
    // LOGIN
    // =========================================================================

    if (!isLogged) {
        return (
            <main className={styles.page}>
                <div className={styles.card}>

                    <h1 className={styles.title}>
                        Admin
                    </h1>

                    <button
                        className={styles.button}
                        onClick={() =>
                            router.push('/home')
                        }
                        style={{
                            marginBottom: '10px'
                        }}
                    >
                        ← Torna alla Home
                    </button>

                    <input
                        type="password"
                        placeholder="Inserisci password"
                        value={inputPassword}
                        onChange={(e) =>
                            setInputPassword(
                                e.target.value
                            )
                        }
                        className={styles.input}
                    />

                    <button
                        onClick={handleLogin}
                        className={styles.button}
                    >
                        Conferma
                    </button>

                    {error && (
                        <p
                            style={{
                                color: '#ff4d4d',
                                textAlign: 'center'
                            }}
                        >
                            {error}
                        </p>
                    )}

                </div>
            </main>
        )
    }

    // =========================================================================
    // PANNELLO ADMIN
    // =========================================================================

    return (
        <main className={styles.page}>
            <div
                className={styles.card}
                style={{
                    maxWidth: '900px',
                    width: '95%',
                    alignItems: 'stretch'
                }}
            >

                {/* ============================================================
                    HEADER
                    ============================================================ */}

                <h1 className={styles.title}>
                    Admin Panel
                </h1>

                <button
                    className={styles.button}
                    onClick={() =>
                        router.push('/home')
                    }
                    style={{
                        marginBottom: '10px'
                    }}
                >
                    ← Torna alla Home
                </button>

                {/* ============================================================
                    ATTIVAZIONE PAGINA VACANZA
                    ============================================================ */}

                <div
                    style={{
                        marginBottom: '20px'
                    }}
                >
                    <button
                        onClick={toggleVacanza}
                        className={styles.button}
                    >
                        Vacanza:{' '}

                        {vacanzaAttiva
                            ? 'ATTIVA 🟢'
                            : 'DISATTIVA 🔴'}
                    </button>
                </div>

                {/* ============================================================
                    TAB
                    ============================================================ */}

                <div
                    style={{
                        display: 'flex',
                        gap: '12px'
                    }}
                >
                    <button
                        className={styles.button}
                        onClick={() =>
                            setTab('drinks')
                        }
                        style={{
                            opacity:
                                tab === 'drinks'
                                    ? 1
                                    : 0.6
                        }}
                    >
                        Drink
                    </button>

                    <button
                        className={styles.button}
                        onClick={() =>
                            setTab('phrases')
                        }
                        style={{
                            opacity:
                                tab === 'phrases'
                                    ? 1
                                    : 0.6
                        }}
                    >
                        Frasi
                    </button>

                    <button
                        className={styles.button}
                        onClick={() =>
                            setTab('sessions')
                        }
                        style={{
                            opacity:
                                tab === 'sessions'
                                    ? 1
                                    : 0.6
                        }}
                    >
                        Sessioni
                    </button>
                </div>

                {/* ============================================================
                    TAB DRINK
                    ============================================================ */}

                {tab === 'drinks' && (
                    <>
                        <h2
                            style={{
                                marginTop: '8px'
                            }}
                        >
                            Aggiungi drink
                        </h2>

                        <input
                            className={styles.input}
                            placeholder="Nome"
                            value={newDrink.name}
                            onChange={(e) =>
                                setNewDrink({
                                    ...newDrink,
                                    name:
                                        e.target.value
                                })
                            }
                        />

                        <input
                            className={styles.input}
                            placeholder="Emoji"
                            value={newDrink.emoji}
                            onChange={(e) =>
                                setNewDrink({
                                    ...newDrink,
                                    emoji:
                                        e.target.value
                                })
                            }
                        />

                        <input
                            className={styles.input}
                            placeholder="Volume ml"
                            type="number"
                            value={
                                newDrink.volume_ml
                            }
                            onChange={(e) =>
                                setNewDrink({
                                    ...newDrink,
                                    volume_ml:
                                        e.target.value
                                })
                            }
                        />

                        <input
                            className={styles.input}
                            placeholder="Percentuale alcol"
                            type="number"
                            value={
                                newDrink.perc_alc
                            }
                            onChange={(e) =>
                                setNewDrink({
                                    ...newDrink,
                                    perc_alc:
                                        e.target.value
                                })
                            }
                        />

                        <select
                            className={styles.input}
                            value={
                                newDrink.category
                            }
                            onChange={(e) =>
                                setNewDrink({
                                    ...newDrink,
                                    category:
                                        e.target.value
                                })
                            }
                        >
                            <option value="beer">
                                beer
                            </option>

                            <option value="cocktail">
                                cocktail
                            </option>

                            <option value="shot">
                                shot
                            </option>
                        </select>

                        <button
                            className={styles.button}
                            onClick={addDrink}
                        >
                            Aggiungi drink
                        </button>

                        <h2
                            style={{
                                marginTop: '16px'
                            }}
                        >
                            Drink esistenti
                        </h2>

                        {drinks.map(
                            (drink) => (
                                <div
                                    key={drink.id}
                                    style={{
                                        border:
                                            '1px solid #2a2a2a',
                                        borderRadius:
                                            '12px',
                                        padding:
                                            '12px',
                                        display:
                                            'flex',
                                        flexDirection:
                                            'column',
                                        gap:
                                            '10px'
                                    }}
                                >
                                    <input
                                        className={
                                            styles.input
                                        }
                                        value={
                                            drink.name
                                        }
                                        onChange={(e) =>
                                            updateDrinkField(
                                                drink.id,
                                                'name',
                                                e.target.value
                                            )
                                        }
                                    />

                                    <input
                                        className={
                                            styles.input
                                        }
                                        value={
                                            drink.emoji ||
                                            ''
                                        }
                                        onChange={(e) =>
                                            updateDrinkField(
                                                drink.id,
                                                'emoji',
                                                e.target.value
                                            )
                                        }
                                    />

                                    <input
                                        className={
                                            styles.input
                                        }
                                        type="number"
                                        value={
                                            drink.volume_ml
                                        }
                                        onChange={(e) =>
                                            updateDrinkField(
                                                drink.id,
                                                'volume_ml',
                                                e.target.value
                                            )
                                        }
                                    />

                                    <input
                                        className={
                                            styles.input
                                        }
                                        type="number"
                                        value={
                                            drink.perc_alc
                                        }
                                        onChange={(e) =>
                                            updateDrinkField(
                                                drink.id,
                                                'perc_alc',
                                                e.target.value
                                            )
                                        }
                                    />

                                    <select
                                        className={
                                            styles.input
                                        }
                                        value={
                                            drink.category ||
                                            'beer'
                                        }
                                        onChange={(e) =>
                                            updateDrinkField(
                                                drink.id,
                                                'category',
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="beer">
                                            beer
                                        </option>

                                        <option value="cocktail">
                                            cocktail
                                        </option>

                                        <option value="shot">
                                            shot
                                        </option>
                                    </select>

                                    <div
                                        style={{
                                            display:
                                                'flex',
                                            gap:
                                                '10px'
                                        }}
                                    >
                                        <button
                                            className={
                                                styles.button
                                            }
                                            onClick={() =>
                                                saveDrink(
                                                    drink
                                                )
                                            }
                                        >
                                            Salva
                                        </button>

                                        <button
                                            className={
                                                styles.button
                                            }
                                            onClick={() =>
                                                toggleDrink(
                                                    drink
                                                )
                                            }
                                        >
                                            {drink.is_active
                                                ? 'Disattiva'
                                                : 'Attiva'}
                                        </button>
                                    </div>
                                </div>
                            )
                        )}
                    </>
                )}

                {/* ============================================================
                    TAB FRASI
                    ============================================================ */}

                {tab === 'phrases' && (
                    <>
                        <h2
                            style={{
                                marginTop: '8px'
                            }}
                        >
                            Aggiungi frase
                        </h2>

                        <select
                            className={styles.input}
                            value={
                                newPhrase.category
                            }
                            onChange={(e) =>
                                setNewPhrase({
                                    ...newPhrase,
                                    category:
                                        e.target.value
                                })
                            }
                        >
                            <option value="SOBRIO">
                                SOBRIO
                            </option>

                            <option value="MEDIO BAC">
                                MEDIO BAC
                            </option>

                            <option value="ALTO BAC">
                                ALTO BAC
                            </option>

                            <option value="LEGGENDA">
                                LEGGENDA
                            </option>

                            <option value="BIRRA">
                                BIRRA
                            </option>

                            <option value="COCKTAIL">
                                COCKTAIL
                            </option>
                        </select>

                        <input
                            className={styles.input}
                            placeholder="Testo frase"
                            value={
                                newPhrase.text
                            }
                            onChange={(e) =>
                                setNewPhrase({
                                    ...newPhrase,
                                    text:
                                        e.target.value
                                })
                            }
                        />

                        <button
                            className={styles.button}
                            onClick={addPhrase}
                        >
                            Aggiungi frase
                        </button>

                        <h2
                            style={{
                                marginTop: '16px'
                            }}
                        >
                            Frasi esistenti
                        </h2>

                        {phrases.map(
                            (phrase) => (
                                <div
                                    key={
                                        phrase.id
                                    }
                                    style={{
                                        border:
                                            '1px solid #2a2a2a',
                                        borderRadius:
                                            '12px',
                                        padding:
                                            '12px',
                                        display:
                                            'flex',
                                        flexDirection:
                                            'column',
                                        gap:
                                            '10px'
                                    }}
                                >
                                    <select
                                        className={
                                            styles.input
                                        }
                                        value={
                                            phrase.category
                                        }
                                        onChange={(e) =>
                                            updatePhraseField(
                                                phrase.id,
                                                'category',
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="SOBRIO">
                                            SOBRIO
                                        </option>

                                        <option value="MEDIO BAC">
                                            MEDIO BAC
                                        </option>

                                        <option value="ALTO BAC">
                                            ALTO BAC
                                        </option>

                                        <option value="LEGGENDA">
                                            LEGGENDA
                                        </option>

                                        <option value="BIRRA">
                                            BIRRA
                                        </option>

                                        <option value="COCKTAIL">
                                            COCKTAIL
                                        </option>
                                    </select>

                                    <input
                                        className={
                                            styles.input
                                        }
                                        value={
                                            phrase.text
                                        }
                                        onChange={(e) =>
                                            updatePhraseField(
                                                phrase.id,
                                                'text',
                                                e.target.value
                                            )
                                        }
                                    />

                                    <div
                                        style={{
                                            display:
                                                'flex',
                                            gap:
                                                '10px'
                                        }}
                                    >
                                        <button
                                            className={
                                                styles.button
                                            }
                                            onClick={() =>
                                                savePhrase(
                                                    phrase
                                                )
                                            }
                                        >
                                            Salva
                                        </button>

                                        <button
                                            className={
                                                styles.button
                                            }
                                            onClick={() =>
                                                togglePhrase(
                                                    phrase
                                                )
                                            }
                                        >
                                            {phrase.is_active
                                                ? 'Disattiva'
                                                : 'Attiva'}
                                        </button>
                                    </div>
                                </div>
                            )
                        )}
                    </>
                )}

                {/* ============================================================
                    TAB SESSIONI
                    ============================================================ */}

                {tab === 'sessions' && (
                    <>
                        <h2
                            style={{
                                marginTop: '8px'
                            }}
                        >
                            Nuova sessione
                        </h2>

                        <p
                            style={{
                                opacity: 0.7,
                                marginTop: 0
                            }}
                        >
                            Crea una nuova vacanza.
                            La sessione verrà creata
                            inizialmente come DRAFT e
                            non sarà ancora attiva.
                        </p>

                        <input
                            className={styles.input}
                            placeholder="Titolo — es. IBIZA 2027"
                            value={
                                newVacation.title
                            }
                            onChange={(e) =>
                                setNewVacation({
                                    ...newVacation,
                                    title:
                                        e.target.value
                                })
                            }
                        />

                        <input
                            className={styles.input}
                            placeholder="Slug — es. ibiza_2027"
                            value={
                                newVacation.slug
                            }
                            onChange={(e) =>
                                setNewVacation({
                                    ...newVacation,

                                    slug:
                                        e.target.value
                                            .toLowerCase()
                                            .replace(
                                                /[^a-z0-9_]/g,
                                                '_'
                                            )
                                })
                            }
                        />

                        <input
                            className={styles.input}
                            placeholder="Timezone"
                            value={
                                newVacation.timezone
                            }
                            onChange={(e) =>
                                setNewVacation({
                                    ...newVacation,

                                    timezone:
                                        e.target.value
                                })
                            }
                        />

                        <label
                            style={{
                                opacity: 0.7,
                                fontSize: '13px',
                                marginTop: '5px'
                            }}
                        >
                            Inizio vacanza
                        </label>

                        <input
                            className={styles.input}
                            type="datetime-local"
                            value={
                                newVacation.startAt
                            }
                            onChange={(e) =>
                                setNewVacation({
                                    ...newVacation,

                                    startAt:
                                        e.target.value
                                })
                            }
                        />

                        <label
                            style={{
                                opacity: 0.7,
                                fontSize: '13px',
                                marginTop: '5px'
                            }}
                        >
                            Fine vacanza
                        </label>

                        <input
                            className={styles.input}
                            type="datetime-local"
                            value={
                                newVacation.endAt
                            }
                            onChange={(e) =>
                                setNewVacation({
                                    ...newVacation,

                                    endAt:
                                        e.target.value
                                })
                            }
                        />

                        <button
                            className={styles.button}
                            onClick={
                                createVacation
                            }
                            disabled={
                                creatingSession
                            }
                        >
                            {creatingSession
                                ? 'Creazione...'
                                : 'Crea sessione'}
                        </button>

                        {sessionMessage && (
                            <div
                                style={{
                                    marginTop:
                                        '10px',
                                    padding:
                                        '12px',
                                    border:
                                        '1px solid #2a2a2a',
                                    borderRadius:
                                        '12px'
                                }}
                            >
                                {sessionMessage}
                            </div>
                        )}

                        <h2
                            style={{
                                marginTop: '28px'
                            }}
                        >
                            Sessioni esistenti
                        </h2>

                        {vacations.map(
                            (vacation) => (
                                <div
                                    key={
                                        vacation.id
                                    }
                                    style={{
                                        border:
                                            '1px solid #2a2a2a',
                                        borderRadius:
                                            '12px',
                                        padding:
                                            '14px',
                                        marginBottom:
                                            '10px'
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize:
                                                '18px',
                                            fontWeight:
                                                '600'
                                        }}
                                    >
                                        {
                                            vacation.title
                                        }
                                    </div>

                                    <div
                                        style={{
                                            marginTop:
                                                '5px',
                                            opacity:
                                                0.65,
                                            fontSize:
                                                '13px'
                                        }}
                                    >
                                        {
                                            vacation.slug
                                        }
                                    </div>

                                    <div
                                        style={{
                                            marginTop:
                                                '10px',
                                            fontSize:
                                                '13px'
                                        }}
                                    >
                                        Stato:{' '}

                                        <strong>
                                            {
                                                vacation.status
                                                    ?.toUpperCase()
                                            }
                                        </strong>
                                    </div>

                                    {/* =========================================
                                        PULSANTE RENDI ATTIVA

                                        Compare solamente sulle sessioni DRAFT.
                                        ========================================= */}

                                    {vacation.status === 'draft' && (
                                        <button
                                            className={
                                                styles.button
                                            }
                                            style={{
                                                marginTop:
                                                    '12px'
                                            }}
                                            onClick={() =>
                                                activateVacation(
                                                    vacation.slug
                                                )
                                            }
                                        >
                                            Rendi attiva
                                        </button>
                                    )}

                                    {vacation.status === 'active' && (
                                        <button
                                            className={styles.button}
                                            style={{
                                                marginTop: '12px'
                                            }}
                                            onClick={() =>
                                                archiveVacation(
                                                    vacation.slug
                                                )
                                            }
                                        >
                                            Termina e archivia
                                        </button>
                                    )}

                                </div>
                            )
                        )}



                        {vacations.length === 0 && (
                            <p
                                style={{
                                    opacity: 0.6
                                }}
                            >
                                Nessuna sessione presente.
                            </p>
                        )}

                    </>
                )}

            </div>
        </main>
    )
}