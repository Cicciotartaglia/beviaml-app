'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { TABLES } from '../../lib/tableNames'
import styles from '../styles/form.module.css'

/*
===============================================================================
PAGINA ADMIN
===============================================================================

Questa pagina permette di gestire alcune configurazioni globali dell'app.

Attualmente consente di:

1. Accedere al pannello tramite password.

2. Gestire le bevande:
   - creare nuovi drink
   - modificare drink esistenti
   - attivare/disattivare drink

3. Gestire le frasi:
   - creare nuove frasi
   - modificare frasi esistenti
   - attivare/disattivare frasi

4. Attivare/disattivare la pagina Vacanza tramite app_config.

IMPORTANTE - SISTEMA DATASET:

Questa pagina NON utilizza:

    users
    drink_logs
    daily_bac_peaks

Quindi il passaggio tra:

    current
    test
    creta_2026

non cambia direttamente il comportamento dell'Admin.

Le tabelle utilizzate qui sono infatti condivise:

    TABLES.drinks
    TABLES.phrases
    TABLES.appConfig

Anche se sono condivise, utilizziamo comunque TABLES.xxx
per evitare di avere nomi di tabelle scritti direttamente
in giro per il progetto.

NOTA FUTURA:

Se in futuro vorremo rendere anche drink e frasi specifici
per ogni vacanza, sarà sufficiente modificare tableNames.js
e adattare la relativa struttura database.

===============================================================================
*/

export default function Admin() {
    const router = useRouter()

    // =========================================================================
    // ACCESSO ADMIN
    // =========================================================================

    /*
     * Password digitata dall'utente.
     */
    const [inputPassword, setInputPassword] = useState('')

    /*
     * Indica se l'utente ha superato il controllo password.
     *
     * false -> mostra schermata login
     * true  -> mostra pannello Admin
     */
    const [isLogged, setIsLogged] = useState(false)

    /*
     * Messaggio di errore in caso di password errata.
     */
    const [error, setError] = useState('')

    /*
     * Tab attualmente visualizzata nel pannello.
     *
     * drinks  -> gestione bevande
     * phrases -> gestione frasi
     */
    const [tab, setTab] = useState('drinks')

    // =========================================================================
    // DATI CARICATI DA SUPABASE
    // =========================================================================

    /*
     * Lista completa delle bevande.
     *
     * Comprende sia quelle attive sia quelle disattivate,
     * perché nell'Admin dobbiamo poterle gestire entrambe.
     */
    const [drinks, setDrinks] = useState([])

    /*
     * Lista completa delle frasi.
     */
    const [phrases, setPhrases] = useState([])

    /*
     * Stato della configurazione "vacanza_attiva".
     *
     * true  -> la voce Vacanza compare nella Home
     * false -> la pagina Vacanza non viene mostrata nel menu
     */
    const [vacanzaAttiva, setVacanzaAttiva] = useState(false)

    // =========================================================================
    // FORM NUOVO DRINK
    // =========================================================================

    /*
     * Stato temporaneo utilizzato per creare una nuova bevanda.
     */
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

    /*
     * Stato temporaneo utilizzato per creare una nuova frase.
     */
    const [newPhrase, setNewPhrase] = useState({
        category: 'SOBRIO',
        text: '',
        is_active: true
    })

    // =========================================================================
    // PASSWORD ADMIN
    // =========================================================================

    /*
     * Password del pannello Admin.
     *
     * ATTENZIONE:
     * essendo scritta nel codice client NON rappresenta
     * una protezione di sicurezza forte.
     *
     * Per l'utilizzo attuale dell'app serve semplicemente
     * a evitare che gli utenti entrino accidentalmente nell'Admin.
     *
     * Se in futuro l'app diventasse pubblica o più sensibile,
     * questa autenticazione andrebbe completamente ripensata.
     */
    const ADMIN_PASSWORD = '1234'

    // =========================================================================
    // LOGIN ADMIN
    // =========================================================================

    /*
     * Confronta la password inserita con ADMIN_PASSWORD.
     */
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

    /*
     * Recupera tutte le bevande dal database.
     *
     * TABLES.drinks attualmente corrisponde a:
     *
     *     drinks
     *
     * ed è una tabella condivisa tra tutti i dataset.
     */
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

    /*
     * Recupera tutte le frasi dal database.
     *
     * TABLES.phrases attualmente corrisponde a:
     *
     *     phrases
     */
    async function loadPhrases() {
        const { data } = await supabase
            .from(TABLES.phrases)
            .select('*')
            .order('id', { ascending: true })

        setPhrases(data || [])
    }

    // =========================================================================
    // CARICAMENTO INIZIALE ADMIN
    // =========================================================================

    /*
     * I dati vengono caricati solamente DOPO
     * che la password Admin è stata accettata.
     */
    useEffect(() => {
        if (!isLogged) return

        async function load() {
            // Carichiamo drink e frasi.
            await loadDrinks()
            await loadPhrases()

            /*
             * Recuperiamo anche la configurazione che decide
             * se mostrare la pagina Vacanza.
             */
            const { data: config } = await supabase
                .from(TABLES.appConfig)
                .select('*')
                .eq('key', 'vacanza_attiva')
                .single()

            setVacanzaAttiva(config?.value || false)
        }

        load()
    }, [isLogged])

    // =========================================================================
    // MODIFICA LOCALE DI UN DRINK
    // =========================================================================

    /*
     * Aggiorna solamente lo stato React locale.
     *
     * NON salva ancora niente su Supabase.
     *
     * Il salvataggio vero avviene premendo il pulsante "Salva".
     */
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
    // SALVATAGGIO DRINK ESISTENTE
    // =========================================================================

    /*
     * Salva sul database le modifiche apportate
     * a una bevanda già esistente.
     */
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

        /*
         * Ricarichiamo dal database per avere
         * una copia aggiornata e coerente.
         */
        loadDrinks()
    }

    // =========================================================================
    // ATTIVA / DISATTIVA DRINK
    // =========================================================================

    /*
     * Inverte il valore is_active della bevanda.
     *
     * Un drink disattivato:
     * - rimane nel database
     * - continua a essere disponibile per i vecchi log
     * - non viene mostrato tra i pulsanti attivi della Home
     */
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
    // AGGIUNTA NUOVO DRINK
    // =========================================================================

    /*
     * Crea una nuova bevanda nella tabella drinks.
     */
    async function addDrink() {
        // Tutti i campi principali sono obbligatori.
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

        /*
         * Inseriamo il drink come attivo di default.
         */
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

        /*
         * Reset del form dopo l'inserimento.
         */
        setNewDrink({
            name: '',
            emoji: '',
            volume_ml: '',
            perc_alc: '',
            category: 'beer',
            is_active: true
        })

        // Aggiorniamo la lista.
        loadDrinks()
    }

    // =========================================================================
    // MODIFICA LOCALE DI UNA FRASE
    // =========================================================================

    /*
     * Come per i drink:
     * modifica solamente lo stato locale React.
     *
     * Il database viene modificato solamente quando
     * viene premuto "Salva".
     */
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
    // SALVATAGGIO FRASE ESISTENTE
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
    // ATTIVA / DISATTIVA FRASE
    // =========================================================================

    /*
     * Permette di mantenere una frase nel database
     * senza utilizzarla temporaneamente nella Home.
     */
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
    // AGGIUNTA NUOVA FRASE
    // =========================================================================

    async function addPhrase() {
        // Categoria e testo sono obbligatori.
        if (!newPhrase.category || !newPhrase.text) {
            alert('Compila tutti i campi della frase')
            return
        }

        /*
         * Le nuove frasi vengono create attive.
         */
        await supabase
            .from(TABLES.phrases)
            .insert({
                category: newPhrase.category,
                text: newPhrase.text,
                is_active: true
            })

        /*
         * Reset del form.
         */
        setNewPhrase({
            category: 'SOBRIO',
            text: '',
            is_active: true
        })

        loadPhrases()
    }

    // =========================================================================
    // ATTIVA / DISATTIVA VACANZA
    // =========================================================================

    /*
     * Modifica il valore della configurazione:
     *
     *     vacanza_attiva
     *
     * Questa configurazione viene letta dalla Home
     * per decidere se mostrare il pulsante "Vacanza".
     */
    async function toggleVacanza() {
        const newValue = !vacanzaAttiva

        await supabase
            .from(TABLES.appConfig)
            .update({
                value: newValue
            })
            .eq('key', 'vacanza_attiva')

        /*
         * Aggiorniamo immediatamente anche lo stato locale
         * senza dover ricaricare tutta la configurazione.
         */
        setVacanzaAttiva(newValue)
    }

    // =========================================================================
    // SCHERMATA LOGIN ADMIN
    // =========================================================================

    /*
     * Finché isLogged è false mostriamo solamente
     * la schermata per inserire la password.
     */
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
                    SELETTORE TAB ADMIN
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
                </div>

                {/* ============================================================
                    TAB DRINK
                    ============================================================ */}

                {tab === 'drinks' && (
                    <>
                        {/* ----------------------------------------------------
                            AGGIUNGI DRINK
                            ---------------------------------------------------- */}

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
                                    name: e.target.value
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
                                    emoji: e.target.value
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

                        {/* ----------------------------------------------------
                            DRINK ESISTENTI
                            ---------------------------------------------------- */}

                        <h2
                            style={{
                                marginTop: '16px'
                            }}
                        >
                            Drink esistenti
                        </h2>

                        {drinks.map((drink) => (
                            <div
                                key={drink.id}
                                style={{
                                    border:
                                        '1px solid #2a2a2a',
                                    borderRadius:
                                        '12px',
                                    padding: '12px',
                                    display: 'flex',
                                    flexDirection:
                                        'column',
                                    gap: '10px'
                                }}
                            >
                                {/* Nome */}
                                <input
                                    className={
                                        styles.input
                                    }
                                    value={drink.name}
                                    onChange={(e) =>
                                        updateDrinkField(
                                            drink.id,
                                            'name',
                                            e.target.value
                                        )
                                    }
                                />

                                {/* Emoji */}
                                <input
                                    className={
                                        styles.input
                                    }
                                    value={
                                        drink.emoji || ''
                                    }
                                    onChange={(e) =>
                                        updateDrinkField(
                                            drink.id,
                                            'emoji',
                                            e.target.value
                                        )
                                    }
                                />

                                {/* Volume */}
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

                                {/* Percentuale alcol */}
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

                                {/* Categoria */}
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

                                {/* Azioni */}
                                <div
                                    style={{
                                        display:
                                            'flex',
                                        gap: '10px'
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
                        ))}
                    </>
                )}

                {/* ============================================================
                    TAB FRASI
                    ============================================================ */}

                {tab === 'phrases' && (
                    <>
                        {/* ----------------------------------------------------
                            AGGIUNGI FRASE
                            ---------------------------------------------------- */}

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
                            value={newPhrase.text}
                            onChange={(e) =>
                                setNewPhrase({
                                    ...newPhrase,
                                    text: e.target.value
                                })
                            }
                        />

                        <button
                            className={styles.button}
                            onClick={addPhrase}
                        >
                            Aggiungi frase
                        </button>

                        {/* ----------------------------------------------------
                            FRASI ESISTENTI
                            ---------------------------------------------------- */}

                        <h2
                            style={{
                                marginTop: '16px'
                            }}
                        >
                            Frasi esistenti
                        </h2>

                        {phrases.map((phrase) => (
                            <div
                                key={phrase.id}
                                style={{
                                    border:
                                        '1px solid #2a2a2a',
                                    borderRadius:
                                        '12px',
                                    padding: '12px',
                                    display: 'flex',
                                    flexDirection:
                                        'column',
                                    gap: '10px'
                                }}
                            >
                                {/* Categoria frase */}
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

                                {/* Testo frase */}
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

                                {/* Azioni */}
                                <div
                                    style={{
                                        display:
                                            'flex',
                                        gap: '10px'
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
                        ))}
                    </>
                )}
            </div>
        </main>
    )
}