// First, so error monitoring is set up before the app loads.
import { rootErrorOptions } from './lib/sentry';

import { ApolloProvider } from '@apollo/client/react';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import { apolloClient } from './lib/apollo';
import { I18nProvider } from './lib/i18n';
import './styles.css';

createRoot(document.getElementById('root')!, rootErrorOptions).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <I18nProvider>
        <BrowserRouter>
          {/* With reduced motion, `motion` drops what moves and keeps fades, everywhere. */}
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </BrowserRouter>
      </I18nProvider>
    </ApolloProvider>
  </StrictMode>
);
