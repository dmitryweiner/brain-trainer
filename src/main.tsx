import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/global.scss'
import { initI18n } from './i18n'
import { createWebServices } from './ui/webServices'
import { startPwa } from './platform/web/pwa'
import { webTones } from './platform/web/audio'
import App from './App.tsx'

const services = { ...createWebServices({ sync: true }), pwa: startPwa(), audio: webTones() }
void initI18n(services.locale)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
)
