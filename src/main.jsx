import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppErrorBoundary, RecoveryScreen } from './components/RecoveryScreen.jsx'
import './index.css'
import './focus.css'
import './landing-mobile.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

// Keep configuration/module failures outside the application's import graph.
import('./App.jsx').then(({ default: App }) => {
  root.render(
    <React.StrictMode>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </React.StrictMode>,
  )
}).catch(() => root.render(<RecoveryScreen />))
