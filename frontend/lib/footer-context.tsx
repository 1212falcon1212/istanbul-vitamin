"use client";
import { createContext, useContext } from "react";
import { emptyFooterCatalog, type FooterCatalog } from "./footer-catalog";
export const FooterCatalogContext = createContext<FooterCatalog>(emptyFooterCatalog);
export const useFooterCatalog = () => useContext(FooterCatalogContext);
