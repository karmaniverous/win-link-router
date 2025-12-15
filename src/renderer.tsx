import './index.css';

import { createRoot } from 'react-dom/client';

import { App } from './ui/App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(<App />);
