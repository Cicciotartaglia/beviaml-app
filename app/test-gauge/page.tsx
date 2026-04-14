'use client'

import { useState } from 'react'
import BacGaugeBroken from '../../components/BacGaugeBroken'
import BacGaugeRound from '../../components/BacGaugeRound'


export default function TestGauge() {
    const [bac, setBac] = useState(0.5)

    function getSoberCountdown(bac: number) {
        if (bac <= 0) return 'Sobrio'

        const hours = bac / 0.11
        const totalMinutes = Math.ceil(hours * 60)

        const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
        const mm = String(totalMinutes % 60).padStart(2, '0')

        return `Sobrio tra ${hh}:${mm}`
    }

    const soberText = getSoberCountdown(bac)

    return (
        <main
            style={{
                minHeight: '100vh',
                background: '#0b0b0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <div
                style={{
                    background: '#111',
                    padding: 30,
                    borderRadius: 20,
                    width: 350,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}
            >
                <BacGaugeBroken bac={bac} soberText={soberText} />
                <BacGaugeRound bac={bac} soberText={soberText} />

                {/* SLIDER */}
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={bac}
                    onChange={(e) => setBac(parseFloat(e.target.value))}
                    style={{ width: '100%', marginTop: 20 }}
                />

                {/* PRESET */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {[0.3, 0.8, 1.4, 1.8, 2.0].map((v) => (
                        <button
                            key={v}
                            onClick={() => setBac(v)}
                            style={{
                                flex: 1,
                                padding: 6,
                                background: '#222',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6
                            }}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setBac(0)}
                    style={{
                        marginTop: 10,
                        width: '100%',
                        padding: 8,
                        background: '#333',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6
                    }}
                >
                    Reset
                </button>
            </div>
        </main>
    )
}