import { PrivyProvider } from '@privy-io/react-auth';
import React from 'react';

export const PrivyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || 'clp8z9q3z00y1l60fje8wg1lx'}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#7c3aed',
          logo: 'https://your-logo-url.com/logo.png',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
};