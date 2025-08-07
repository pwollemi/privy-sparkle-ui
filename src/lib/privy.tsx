import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

export const PrivyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PrivyProvider
      appId="cmcwv1wi201tnjm0mmexyzxyi"
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