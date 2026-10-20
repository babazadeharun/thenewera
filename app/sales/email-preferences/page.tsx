"use client";
import { useState } from "react";
export default function EmailPreferences() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  async function stop() {
    setBusy(true);
    try {
      const q = new URLSearchParams(location.search),
        r = await fetch(
          "/api/sales/email-preferences?" +
            new URLSearchParams({
              id: q.get("id") || "",
              sig: q.get("sig") || "",
            }),
          { method: "POST" },
        ),
        d = await r.json();
      if (!r.ok) throw Error(d.error || "Əməliyyat alınmadı.");
      setDone(true);
      setMessage("Təklif kampaniyaları üzrə e-poçt göndərişi dayandırıldı.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      style={{
        maxWidth: 600,
        margin: "80px auto",
        padding: 28,
        color: "#172f3c",
        background: "#f5f9fc",
        borderRadius: 18,
      }}
    >
      <h1>NEW ERA — E-poçt seçimləri</h1>
      <p>
        Bu ünvan üçün gələcək təklif kampaniyalarını dayandırmaq istəyirsiniz?
      </p>
      <p>Hesab təsdiqi və xidmət bildirişləri bu seçimdən təsirlənmir.</p>
      {!done && (
        <button
          disabled={busy}
          onClick={stop}
          style={{ padding: "14px 20px", cursor: "pointer" }}
        >
          {busy ? "Gözləyin…" : "Təklif məktublarını dayandır"}
        </button>
      )}
      <p role="status">{message}</p>
    </main>
  );
}
