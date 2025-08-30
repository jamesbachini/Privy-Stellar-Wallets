// src/App.jsx
import { useEffect, useMemo, useState } from 'react';
import { Buffer } from 'buffer';
import { Keypair } from '@stellar/stellar-sdk';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/extended-chains';

/* -------------------------------------------------------------------------- */
/*  Demo component                                                            */
/* -------------------------------------------------------------------------- */
function StellarDemo() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets, rawSign } = useWallets();
  const { createWallet } = useCreateWallet();

  /*  – If the user already has a Stellar wallet, grab it.
      – If we just created one, keep it in local state so the
        UI doesn’t flicker while the global wallets array refreshes.  */
  const [localWallet, setLocalWallet] = useState(null);
  const stellarWallet = useMemo(() => {
    return (
      localWallet ?? wallets.find(w => w.chainType === 'stellar') ?? null
    );
  }, [wallets, localWallet]);

  const [status, setStatus] = useState('');

  /* ---------------------------------------------------------------------- */
  /*  Create a new Stellar wallet                                           */
  /* ---------------------------------------------------------------------- */
  const handleCreateWallet = async () => {
    try {
      setStatus('Creating Stellar wallet…');
      const { wallet } = await createWallet({ chainType: 'stellar' });
      setLocalWallet(wallet);
      setStatus(`✅ Wallet created\n${wallet.address}`);
    } catch (err) {
      console.error(err);
      setStatus(`❌ Failed: ${err.message}`);
      console.log(wallets);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*  Sign + verify a sample hash                                           */
  /* ---------------------------------------------------------------------- */
  const handleSignHash = async () => {
    if (!stellarWallet) return;
    try {
      setStatus('Requesting signature…');

      const hash =
        '0x6503b027a625549f7be691646404f275f149d17a119a6804b855bac3030037aa';

      /*  NOTE: rawSign needs walletId, not address!  */
      const signature = await rawSign({
        chainType: 'stellar',
        walletId:   stellarWallet.id,
        hash,
      });

      /*  Local verification with stellar-sdk  */
      const kp             = Keypair.fromPublicKey(stellarWallet.address);
      const hashBytes      = Buffer.from(hash.slice(2), 'hex');
      const signatureBytes = Buffer.from(signature.slice(2), 'hex');
      const verified       = kp.verify(hashBytes, signatureBytes);

      setStatus(
        `Signature: ${signature}\nVerified? ${verified ? '✅' : '❌'}`
      );
    } catch (err) {
      console.error(err);
      setStatus(`❌ Signing failed: ${err.message}`);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*  Simple UI                                                             */
  /* ---------------------------------------------------------------------- */
  if (!ready)           return <p>Loading Privy…</p>;
  if (!authenticated)
    return (
      <div style={{ padding: 24 }}>
        <button onClick={login}>Login with Privy</button>
      </div>
    );

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <strong>Logged in ✅</strong>

      {stellarWallet ? (
        <>
          <div>Stellar address: {stellarWallet.address}</div>
          <button onClick={handleSignHash}>Sign example hash</button>
        </>
      ) : (
        <button onClick={handleCreateWallet}>Create Stellar wallet</button>
      )}

      <button onClick={logout}>Logout</button>

      {status && (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            background: '#f6f8fa',
            padding: 12,
            borderRadius: 4,
          }}
        >
          {status}
        </pre>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Root – enable Stellar in the SDK via extendedChains                       */
/* -------------------------------------------------------------------------- */
export default function App() {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      config={{
        /*  Turn on Tier-2 (“extended”) chains we want to use.               */
        extendedChains: {
          chains: ['stellar'],
        },
        /*  Optional: auto-create wallets on first login.                    */
        embeddedWallets: { createOnLogin: 'all-users' },
      }}
    >
      <StellarDemo />
    </PrivyProvider>
  );
}