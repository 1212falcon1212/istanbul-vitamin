"use client";

import { useEffect, useState } from "react";

export type LocationFields = {city: string; district: string; neighborhood: string; street: string};
const base = "/adres/tr-202610";
const manualValue = "__manual__";
const style = "mt-1 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm disabled:bg-gray-50";

function useList<T>(url: string) {
  const [result, setResult] = useState<{url: string; data?: T; failed?: boolean}>();
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, {signal: controller.signal}).then(async r => {
      if (!r.ok) throw Error();
      const data: T = await r.json();
      if (!controller.signal.aborted) setResult({url, data});
    }).catch(() => {if (!controller.signal.aborted) setResult({url, failed:true});});
    return () => controller.abort();
  }, [url]);
  return result?.url === url ? result : undefined;
}

function Choice({label, value, options, disabled, loading, optional, onChange}: {
  label: string; value: string; options: string[]; disabled?: boolean; loading?: boolean; optional?: boolean; onChange: (value: string) => void;
}) {
  const [manual,setManual] = useState(false);
  return <div>
    <label className="block text-sm font-medium">{label}
      <select className={style} required={!optional} disabled={disabled} value={manual ? manualValue : value}
        onChange={e => {const custom=e.target.value === manualValue; setManual(custom); onChange(custom ? "" : e.target.value);}}>
        <option value="">{loading ? "Yükleniyor…" : "Seçiniz"}</option>
        {value && !options.includes(value) && !manual && <option value={value}>{value}</option>}
        {options.map(name => <option key={name} value={name}>{name}</option>)}
        <option value={manualValue}>Listede yok · elle gir</option>
      </select>
    </label>
    {manual && <input aria-label={label+" adı"} required value={value} maxLength={150} className={style}
      onChange={e => onChange(e.target.value)} />}
  </div>;
}

export default function AddressLocationFields({value,onChange,legacyAddress}: {value: LocationFields; legacyAddress?: {city:string;district:string;neighborhood?:string;street?:string}; onChange: (next:LocationFields)=>void}) {
  const index = useList<Record<string, Record<string, number>>>(base+"/index.json");
  const districts = index?.data?.[value.city] ?? {};
  const id = districts[value.district];
  const areas = useList<Record<string,string[]>>(id ? base+"/"+id+".json" : "");
  const sameLegacyDistrict = legacyAddress?.city === value.city && legacyAddress?.district === value.district;
  const sorted = (names:string[]) => names.sort((a,b)=>a.localeCompare(b,"tr"));
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <Choice label="İl" value={value.city} options={sorted(Object.keys(index?.data ?? {}))} loading={!index}
      onChange={city => onChange({city,district:"",neighborhood:"",street:""})}/>
    <Choice key={"district-"+value.city} label="İlçe" value={value.district} disabled={!value.city} options={sorted(Object.keys(districts))}
      onChange={district => onChange({...value,district,neighborhood:"",street:""})}/>
    <Choice key={"area-"+value.city+"-"+value.district} label="Mahalle / Köy" optional={sameLegacyDistrict && !legacyAddress?.neighborhood} value={value.neighborhood} disabled={!value.district}
      loading={!!id && !areas} options={sorted(Object.keys(areas?.data ?? {}))}
      onChange={neighborhood => onChange({...value,neighborhood,street:""})}/>
    <Choice key={"street-"+value.city+"-"+value.district+"-"+value.neighborhood} label="Cadde / Sokak" optional={sameLegacyDistrict && !legacyAddress?.street && (legacyAddress?.neighborhood || "") === value.neighborhood} value={value.street} disabled={!value.neighborhood}
      options={sorted([...(areas?.data?.[value.neighborhood] ?? [])])}
      onChange={street => onChange({...value,street})}/>
    {(index?.failed || areas?.failed) && <p role="status" className="text-sm sm:col-span-2">Adres listesi yüklenemedi. “Listede yok” seçeneğiyle adresinizi yazabilirsiniz.</p>}
  </div>;
}
