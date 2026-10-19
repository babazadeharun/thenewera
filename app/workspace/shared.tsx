"use client";
import {
  useEffect,
  useRef,
  useState,
  isValidElement,
  type FormEvent,
} from "react";
export type R = Record<string, any>;
export async function api(url: string, b?: unknown) {
  const r = await fetch(url, {
    method: b === undefined ? "GET" : "POST",
    cache: "no-store",
    headers: b === undefined ? {} : { "Content-Type": "application/json" },
    body: b === undefined ? undefined : JSON.stringify(b),
  });
  const d = await r.json();
  if (!r.ok) {
    if (d.error?.includes("[MFA_REQUIRED]") && typeof window !== "undefined") {
      const next = location.pathname + location.search;
      location.href = "/workspace/account?next=" + encodeURIComponent(next);
    }
    throw Error(d.error || "Əməliyyat mümkün olmadı.");
  }
  return d;
}
export const dt = (v: unknown) =>
  v ? new Date(String(v)).toLocaleDateString("az-AZ") : "";
export const roleNames: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Menecer",
  SALES: "Satış əməkdaşı",
  ACCOUNTANT: "Mühasib",
  VIEWER: "Yalnız baxış",
};
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
};
export function Form({
  fields,
  values = {},
  submit,
  label = "Yadda saxla",
  disabled = false,
  children,
}: {
  fields: Field[];
  values?: R;
  submit: (b: R) => Promise<void>;
  label?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const b = Object.fromEntries(new FormData(e.currentTarget));
      await submit(b);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send}>
      <div className="crmFields">
        {fields.map((f) => (
          <label key={f.key}>
            {f.label}
            {f.options ? (
              <select
                disabled={disabled}
                name={f.key}
                defaultValue={String(values[f.key] ?? "")}
                required={f.required}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                disabled={disabled}
                name={f.key}
                defaultValue={String(values[f.key] ?? "")}
                required={f.required}
              />
            ) : (
              <input
                disabled={disabled}
                name={f.key}
                type={f.type || "text"}
                defaultValue={String(values[f.key] ?? "")}
                required={f.required}
                min={f.type === "number" ? 0 : undefined}
                step={f.type === "number" ? "0.01" : undefined}
                maxLength={20000}
              />
            )}
          </label>
        ))}
      </div>
      {children}
      {error && (
        <p className="crmError" role="alert">
          {error}
        </p>
      )}
      {!disabled && (
        <button className="crmPrimary" disabled={busy}>
          {busy ? "Gözləyin…" : label}
        </button>
      )}
    </form>
  );
}
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const d = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    d.current?.showModal();
    return () => d.current?.close();
  }, []);
  return (
    <dialog
      ref={d}
      className="crmModal"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="crmRow">
        <h2>{title}</h2>
        <button onClick={close} aria-label="Bağla">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Table({ rows }: { rows: R[] }) {
  if (!rows.length) return <p className="crmEmpty">Məlumat yoxdur.</p>;
  const keys = Object.keys(rows[0]);
  return (
    <div className="crmTableWrap">
      <table>
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {keys.map((k) => (
                <td key={k}>
                  {isValidElement(r[k])
                    ? r[k]
                    : r[k] instanceof Object
                      ? JSON.stringify(r[k])
                      : String(r[k] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
