"use client";

import { PropsWithChildren } from "react";
import { AlchemyClientState } from "@account-kit/core";
import { AlchemyAccountProvider } from "@account-kit/react";
import { config, queryClient } from "~~/account.config";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";

export const Providers = (props: PropsWithChildren<{ initialState?: AlchemyClientState }>) => {
  return (
    <ThemeProvider defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <AlchemyAccountProvider config={config} queryClient={queryClient} initialState={props.initialState}>
        <ScaffoldEthAppWithProviders>{props.children}</ScaffoldEthAppWithProviders>
      </AlchemyAccountProvider>
    </ThemeProvider>
  );
};
