export const PUSH_CHANGED = "iv-push-changed";
export const PWA_PUSH_DISMISSED = "iv-pwa-push-dismissed-v1";
export function shouldOfferPush({standalone,configured,supported,permission,enabled,dismissed,path}: {standalone:boolean;configured:boolean;supported:boolean;permission:string;enabled:boolean;dismissed:boolean;path:string}) {
 return standalone && configured && supported && permission!=="denied" && !enabled && !dismissed && !/^\/(odeme|sepet|yonetim|giris-yap|kayit-ol)(\/|$)/.test(path);
}
