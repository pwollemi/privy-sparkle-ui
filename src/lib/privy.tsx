import { PrivyProvider } from '@privy-io/react-auth';
import React from 'react';

export const PrivyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PrivyProvider
      appId="cmcwv1wi201tnjm0mmexyzxyi"
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#7c3aed',
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