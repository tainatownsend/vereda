import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PageBackButton({ fallback = '/home' }) {
  const navigate = useNavigate()
  const goBack = () => {
    // Router-owned history avoids sending a direct-link visitor outside Vereda.
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
  return <button type="button" onClick={goBack} className="northstar-icon-button shrink-0" aria-label="Voltar" title="Voltar">
    <ChevronLeft size={24} aria-hidden="true" />
  </button>
}
