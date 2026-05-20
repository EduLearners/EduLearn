import { StrictMode }         from 'react';
import { createRoot }         from 'react-dom/client';
import { Provider }           from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store }              from './store/index.js';
import { queryClient }        from './api/queryClient.js';
import { ToastProvider }      from './components/shared/ToastQueue.jsx';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.scss';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </QueryClientProvider>
        </Provider>
    </StrictMode>
);
