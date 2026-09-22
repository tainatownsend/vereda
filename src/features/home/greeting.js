export function getGreeting(name, date = new Date()) {
  const hour = date.getHours()
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const first = String(name || '').trim().split(/\s+/)[0]
  const normalized = first.toLocaleLowerCase('pt-BR')
  const firstName = normalized.charAt(0).toLocaleUpperCase('pt-BR') + normalized.slice(1)
  return firstName ? `${period}, ${firstName}` : period
}
