import { Buffer } from 'buffer';
import process from 'process';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfill for Node.js globals in browser
window.Buffer = Buffer;
window.process = process;

createRoot(document.getElementById("root")!).render(<App />);
