'use client'

import { useEffect } from 'react'
import {
    useAppKitState,
    useAppKitTheme,
    useAppKitEvents,
    useAppKitAccount,
    useWalletInfo
     } from '@reown/appkit/react'
import { useClientMounted } from "@/hooks/useClientMount";

export const InfoList = () => {
    const kitTheme = useAppKitTheme();
    const state = useAppKitState();
    const {address, caipAddress, isConnected, embeddedWalletInfo} = useAppKitAccount();
    const events = useAppKitEvents()
    const walletInfo = useWalletInfo()
    const mounted = useClientMounted();
    useEffect(() => {
        console.log("Events: ", events);
    }, [events]);

  return !mounted ? null : (
    <>
        <section>
            <h2>useAppKit</h2>
            <pre>
                Address: {address}<br />
                caip Address: {caipAddress}<br />
                Connected: {isConnected.toString()}<br />
             
            </pre>
        </section>


        <section>
            <h2>WalletInfo</h2>
            <pre>
                Name: {walletInfo.walletInfo?.name?.toString()}<br />
            </pre>
        </section>
    </>
  )
}
