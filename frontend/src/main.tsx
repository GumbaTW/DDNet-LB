import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LeaderboardProvider } from './context/LeaderboardContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <LeaderboardProvider>
        <App />
      </LeaderboardProvider>
    </BrowserRouter>
  </StrictMode>,
)
