'use client'

type Props = {
    bac: number
    soberText: string
}

export default function BacGaugeBroken({ bac, soberText }: Props) {
    const maxBac = 2.0
    const redStart = 1.4

    const progress = Math.max(0, Math.min(bac / maxBac, 1))
    const redStartPercent = redStart / maxBac

    // lunghezze path (approx ma funzionano bene)
    const TOTAL = 400
    const RED = 60

    const normalProgress = Math.min(progress, redStartPercent)
    const redProgress = progress > redStartPercent
        ? (progress - redStartPercent) / (1 - redStartPercent)
        : 0

    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 320, margin: '0 auto' }}>
                <svg viewBox="0 0 320 120">

                    {/* BASE */}
                    <path
                        d="M20 100 L95 25 L230 25 L300 25"
                        stroke="#3a3a3a"
                        strokeWidth="17"
                        fill="none"
                        strokeLinejoin="round"
                        strokeLinecap="butt"
                    />

                    {/* FILL NORMALE */}
                    <path
                        d="M20 100 L95 25 L230 25"
                        stroke="#f2f2f2"
                        strokeWidth="11"
                        fill="none"
                        strokeLinejoin="round"
                        strokeLinecap="butt"
                        style={{
                            strokeDasharray: TOTAL,
                            strokeDashoffset: TOTAL - normalProgress * TOTAL,
                            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }}
                    />
                    {/* CUT MASK per taglio orizzontale sulla parte obliqua */}
                    <line
                        x1="10"
                        y1="100"
                        x2="50"
                        y2="100"
                        stroke="#111"
                        strokeWidth="20"
                        strokeLinecap="butt"
                    />



                    {/* RED BASE */}
                    <path
                        d="M230 25 L300 25"
                        stroke="#3a0000"
                        strokeWidth="17"
                        fill="none"
                        strokeLinecap="butt"
                    />

                    {/* RED ACTIVE */}
                    {progress > redStartPercent && (
                        <path
                            d="M230 25 L300 25"
                            stroke="#ff2b2b"
                            strokeWidth="11"
                            fill="none"
                            strokeLinecap="butt"
                            style={{
                                strokeDasharray: RED,
                                strokeDashoffset: RED - redProgress * RED,
                                transition: 'stroke-dashoffset 0.4s ease-out'
                            }}
                        />

                    )}
                    <line
                        x1="290"
                        y1="43"
                        x2="320"
                        y2="14"
                        stroke="#111"
                        strokeWidth="22"
                        strokeLinecap="butt"
                    />
                </svg>

                {/* BAC */}
                <div
                    style={{
                        position: 'absolute',
                        top: 40,
                        width: '100%',
                        fontSize: 42,
                        fontWeight: 700,
                        color: 'white'
                    }}
                >
                    {bac.toFixed(2)}
                </div>
            </div>

            {/* SOBER TEXT */}
            <div style={{ marginTop: 8, color: '#aaa', fontSize: 14 }}>
                {soberText}
            </div>
        </div>
    )
}