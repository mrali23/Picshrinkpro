import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root')!;

// Production pages are prerendered at build time, so hydrate when markup is already there.
// In `vite dev` (and for the admin shell) #root is empty and the app renders from scratch.
if (container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
