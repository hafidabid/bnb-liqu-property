import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Web3Provider } from '@/providers/Web3Provider'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </StrictMode>
)
