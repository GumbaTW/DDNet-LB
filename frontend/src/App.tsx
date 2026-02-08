import { Routes, Route } from 'react-router-dom'
import { useLeaderboard } from './context/LeaderboardContext'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { Profile } from './pages/Profile'
import styles from './App.module.css'

function App() {
  const { entries, generatedAt, loading, error } = useLeaderboard()

  const footerText = loading
    ? 'Loading…'
    : error
      ? 'Using fallback data'
      : generatedAt
        ? `Last updated: ${new Date(generatedAt).toLocaleString()}`
        : 'Fallback data'

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>DDNet Leaderboard</h1>
        <p className={styles.subtitle}>Gumba&apos;s version ❤</p>
      </header>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<LeaderboardPage entries={entries} loading={loading} error={error} />} />
          <Route path="/player/:name" element={<Profile />} />
        </Routes>
      </main>
      <footer className={styles.footer}>
        <span>{footerText}</span>
      </footer>
    </div>
  )
}

export default App
