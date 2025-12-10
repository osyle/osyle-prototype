import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App.tsx'
import DeviceContextProvider from './contexts/DeviceContextProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeviceContextProvider>
      <App />
    </DeviceContextProvider>
  </StrictMode>,
)
