"use client";

import { type ReactNode } from "react";

interface LenisProviderProps {
  children: ReactNode;
}

/**
 * No-op wrapper. Önceden useEffect ile `scrollBehavior = "smooth"` set
 * ediyordu; Safari'de Link tıklamasından sonra animasyonlu scroll bazen
 * tıklamanın algılanmadığı hissini veriyordu. Smooth scroll'u kaldırdık.
 */
export default function LenisProvider({ children }: LenisProviderProps) {
  return <>{children}</>;
}
