import { useReadingMinutesLast7Days } from '@/hooks'

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function ReadingChart() {
  const { data, loading } = useReadingMinutesLast7Days()

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 16, height: 128 }} />
    )
  }

  const maxMinutes = Math.max(...data.map(d => Number(d.minutes)), 1)
  const totalMinutes = data.reduce((sum, d) => sum + Number(d.minutes), 0)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8' }}>
          Últimos 7 dias
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#7B5EA7' }}>
          {Math.round(totalMinutes)} min total
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height: 96 }}>
        {data.map((d, i) => {
          const minutes  = Number(d.minutes)
          const heightPct = minutes > 0 ? Math.max((minutes / maxMinutes) * 100, 15) : 3
          const isToday  = d.read_date === today
          const date     = new Date(d.read_date + 'T00:00:00')
          const dayLabel = DAYS_PT[date.getDay()]

          return (
            <div key={d.read_date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  borderRadius: '4px 4px 0 0',
                  background: minutes > 0
                    ? isToday
                      ? 'linear-gradient(to top, #5A3F88, #A98FCC)'
                      : '#DDD6F3'
                    : '#F1F5F9',
                  transition: 'height 0.5s ease',
                }} />
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: isToday ? '#7B5EA7' : '#94A3B8',
                lineHeight: 1,
              }}>
                {dayLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}