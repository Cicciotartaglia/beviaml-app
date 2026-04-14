'use client'

type Props = {
    bac: number
    soberText: string
}

export default function BacGaugeRound({ bac, soberText }: Props) {
    const maxBac = 2.0
    const redStart = 1.4

    const progress = Math.max(0, Math.min(bac / maxBac, 1))
    const redStartPercent = redStart / maxBac
    const isRed = bac >= redStart

    const cx = 160
    const cy = 140

    const rBg = 95
    const rMain = 78

    const strokeBg = 4
    const strokeMain = 18

    const startAngle = 225
    const endAngle = 495

    function polarToCartesian(
        centerX: number,
        centerY: number,
        radius: number,
        angle: number
    ) {
        const rad = (angle - 90) * Math.PI / 180
        return {
            x: centerX + radius * Math.cos(rad),
            y: centerY + radius * Math.sin(rad)
        }
    }

    function describeArc(radius: number, startDeg: number, endDeg: number) {
        const start = polarToCartesian(cx, cy, radius, startDeg)
        const end = polarToCartesian(cx, cy, radius, endDeg)
        const largeArcFlag = endDeg - startDeg <= 180 ? '0' : '1'

        return [
            'M', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y
        ].join(' ')
    }

    function valueToAngle(value: number) {
        const clamped = Math.max(0, Math.min(value / maxBac, 1))
        return startAngle + (endAngle - startAngle) * clamped
    }

    function formatTickLabel(value: number) {
        if (value === 2) return '2'
        return value.toFixed(1)
    }

    function renderTick(value: number) {
        const angle = valueToAngle(value)

        const tickInner = polarToCartesian(cx, cy, rBg + 6, angle)
        const tickOuter = polarToCartesian(cx, cy, rBg + 15, angle)
        const labelPos = polarToCartesian(cx, cy, rBg + 28, angle)

        const tickColor = value >= redStart ? '#ff2b2b' : '#d8d8d8'
        const textColor = value >= redStart ? '#ff2b2b' : '#e5e5e5'
        const showLabel = value !== 0

        return (
            <g key={value}>
                <line
                    x1={tickInner.x}
                    y1={tickInner.y}
                    x2={tickOuter.x}
                    y2={tickOuter.y}
                    stroke={tickColor}
                    strokeWidth={2}
                    strokeLinecap="butt"
                    opacity={0.95}
                />
                {showLabel && (
                    <text
                        x={labelPos.x}
                        y={labelPos.y}
                        fill={textColor}
                        fontSize={10}
                        fontWeight={700}
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {formatTickLabel(value)}
                    </text>
                )}
            </g>
        )
    }

    const redStartAngle = valueToAngle(redStart)

    const normalBgArc = describeArc(rBg, startAngle, redStartAngle)
    const redBgArc = describeArc(rBg, redStartAngle, endAngle)
    const fullMainArc = describeArc(rMain, startAngle, endAngle)

    const normalizedLength = 100

    const whiteProgress = Math.min(progress, redStartPercent)
    const redProgress =
        progress > redStartPercent
            ? (progress - redStartPercent) / (1 - redStartPercent)
            : 0

    const whiteDasharray = `${whiteProgress * normalizedLength} ${normalizedLength}`
    const redSegmentLength = normalizedLength - redStartPercent * normalizedLength
    const redVisibleLength = redProgress * redSegmentLength
    const redDasharray = `${redVisibleLength} ${normalizedLength}`
    const redDashoffset = -(redStartPercent * normalizedLength)

    const redIntensity = isRed
        ? Math.max(0, Math.min((bac - redStart) / (maxBac - redStart), 1))
        : 0

    const glowPx = isRed ? 6 + redIntensity * 8 : 0

    const tickValues = [0.0, 0.3, 0.6, 1.0, 1.4, 1.7, 2.0]

    return (
        <div style={{ textAlign: 'center' }}>
            <style>
                {`
          @keyframes pulseRed {
            0% {
              filter: drop-shadow(0 0 ${Math.max(4, glowPx - 3)}px #ff2b2b);
            }
            50% {
              filter: drop-shadow(0 0 ${glowPx + 4}px #ff2b2b);
            }
            100% {
              filter: drop-shadow(0 0 ${Math.max(4, glowPx - 3)}px #ff2b2b);
            }
          }
        `}
            </style>

            <div
                style={{
                    position: 'relative',
                    width: 320,
                    height: 280,
                    margin: '0 auto'
                }}
            >
                <svg viewBox="0 0 320 280">
                    {tickValues.map(renderTick)}

                    {/* CONTORNO ESTERNO NORMALE */}
                    <path
                        d={normalBgArc}
                        stroke="#cfcfcf"
                        strokeWidth={strokeBg}
                        fill="none"
                        strokeLinecap="butt"
                        opacity={0.95}
                    />

                    {/* CONTORNO ESTERNO ROSSO */}
                    <path
                        d={redBgArc}
                        stroke="#ff2b2b"
                        strokeWidth={strokeBg}
                        fill="none"
                        strokeLinecap="butt"
                        opacity={0.95}
                    />

                    {/* RIEMPIMENTO INTERNO BIANCO */}
                    <path
                        d={fullMainArc}
                        stroke="#ffffff"
                        strokeWidth={strokeMain}
                        fill="none"
                        strokeLinecap="butt"
                        pathLength={normalizedLength}
                        strokeDasharray={whiteDasharray}
                        strokeDashoffset={0}
                        style={{
                            transition: 'stroke-dasharray 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }}
                    />

                    {/* RIEMPIMENTO INTERNO ROSSO */}
                    {progress > redStartPercent && (
                        <path
                            d={fullMainArc}
                            stroke="#ff2b2b"
                            strokeWidth={strokeMain}
                            fill="none"
                            strokeLinecap="butt"
                            pathLength={normalizedLength}
                            strokeDasharray={redDasharray}
                            strokeDashoffset={redDashoffset}
                            style={{
                                transition:
                                    'stroke-dasharray 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.25s ease',
                                filter: `drop-shadow(0 0 ${glowPx}px #ff2b2b)`,
                                animation: 'pulseRed 0.8s infinite ease-in-out'
                            }}
                        />
                    )}
                </svg>

                <div
                    style={{
                        position: 'absolute',
                        top: 110,
                        width: '100%',
                        fontSize: 42,
                        fontWeight: 700,
                        color: 'white'
                    }}
                >
                    {bac.toFixed(2)}
                </div>
            </div>

            <div style={{ marginTop: 6, color: '#aaa', fontSize: 25 }}>
                {soberText}
            </div>
        </div>
    )
}