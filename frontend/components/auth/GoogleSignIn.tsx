"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";

type GoogleIdentity = { accounts: { id: {
 initialize: (options: {client_id: string; callback: (response: {credential: string}) => void}) => void;
 renderButton: (element: HTMLElement, options: {theme: string; size: string; text: string}) => void;
} } };
export default function GoogleSignIn() {
 const { settings } = useSettings();
 const { googleLogin } = useAuth();
 const container = useRef<HTMLDivElement>(null);
 const login = useRef(googleLogin);
 login.current = googleLogin;
 const [ready,setReady] = useState(false);
 const [error,setError] = useState("");
 const [busy,setBusy] = useState(false);
 const clientID = settings.google_login_client_id;
 useEffect(() => {
  const google = (window as Window & {google?: GoogleIdentity}).google;
  if (!ready || !clientID || !google || !container.current) return;
  google.accounts.id.initialize({client_id:clientID, callback: async ({credential}) => {
   setBusy(true);setError("");
   try { await login.current(credential); }
   catch (e) { setError(e instanceof Error ? e.message : "Google girişi başarısız"); }
   finally { setBusy(false); }
  }});
  google.accounts.id.renderButton(container.current,{theme:"outline",size:"large",text:"continue_with"});
 },[ready,clientID]);
 if (!clientID) return null;
 return <div className="my-4 space-y-2">
  <Script src="https://accounts.google.com/gsi/client" onReady={() => setReady(true)} onError={() => setError("Google yüklenemedi. Sayfayı yenileyip tekrar deneyin.")} />
  <div ref={container} className={busy ? "pointer-events-none opacity-50" : ""} />
  {busy && <p role="status">Google ile giriş yapılıyor…</p>}
  {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
 </div>;
}
