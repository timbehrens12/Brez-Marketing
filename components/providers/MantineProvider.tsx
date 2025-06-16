'use client';

import { MantineProvider as MantineProviderBase } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

interface MantineProviderProps {
  children: React.ReactNode;
}

export default function MantineProvider({ children }: MantineProviderProps) {
  return (
    <MantineProviderBase
      theme={{
        fontFamily: 'Inter, sans-serif',
        colors: {
          dark: [
            '#C1C2C5',
            '#A6A7AB', 
            '#909296',
            '#5c5f66',
            '#373A40',
            '#2C2E33',
            '#25262B',
            '#1A1B1E',
            '#141517',
            '#101113',
          ],
        },
        primaryColor: 'blue',
      }}
    >
      <Notifications position="top-right" />
      {children}
    </MantineProviderBase>
  );
} 