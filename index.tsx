import { createRoot } from 'react-dom/client';

// Clear the existing HTML content
document.body.innerHTML = '<div id="app"></div>';

// Render your React component instead
const appElement = document.getElementById('app');
if (!appElement) {
    throw new Error("The 'app' element was not preset.");
}
const root = createRoot(appElement);
root.render(<h1>Hello, world</h1>);
