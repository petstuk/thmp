const company = (import.meta.env.VITE_COMPANY_NAME ?? '').trim()

/** Shown in the shell, auth pages, and browser tab. Default `THMP`; with `VITE_COMPANY_NAME=Acme` → `Acme THMP`. */
export const appDisplayName: string = company ? `${company} THMP` : 'THMP'
