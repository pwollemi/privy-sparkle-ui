import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

export const PrivyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PrivyProvider
      appId="your-privy-app-id" // Replace with actual Privy app ID
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#C084FC',
          logo: undefined,
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        loginMethods: ['wallet', 'email'],
      }}
    >
      {children}
    </PrivyProvider>
  );
};