import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/global.scss'
import { initI18n } from './i18n'
import { createWebServices } from './ui/webServices'
import App from './App.tsx'

const services = createWebServices({ sync: true })
void initI18n(services.locale)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
)
