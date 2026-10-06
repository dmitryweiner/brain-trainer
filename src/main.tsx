import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/global.scss'
import { initI18n } from './i18n'
import { createWebServices } from './ui/webServices'
import { startPwa } from './platform/web/pwa'
import { webTones } from './platform/web/audio'
import { webFeedback } from './platform/web/feedback'
import App from './App.tsx'

const base = createWebServices({ sync: true })
const audio = webTones()
const services = { ...base, pwa: startPwa(), audio, feedback: webFeedback(base.prefs, audio) }
void initI18n(services.locale)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
)
