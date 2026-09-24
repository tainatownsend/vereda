import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppRecovery, { UnavailableScreen } from './components/AppRecovery'
import { hasSupabaseConfiguration } from './lib/supabase'
import './index.css'
import './focus.css'
import './landing-mobile.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRecovery>{hasSupabaseConfiguration ? <App /> : <UnavailableScreen />}</AppRecovery>
  </React.StrictMode>
)
