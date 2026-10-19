"use client";
import { useState } from "react";
import { X } from "lucide-react";
import {
  importFields,
  phoneKey,
  importAliases,
  headerKey,
} from "@/lib/sales/import-fields";

type Parsed = {
  headers: string[];
  rows: string[][];
  rowNumbers?: number[];
  headerRow?: number;
  headerRows?: number[];
  maxHeaderRow?: number;
};
type Result = {
  index: number;
  status: string;
  data?: {
    title: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
  };
  duplicate?: string;
  error?: string;
};
const label = (s: string) =>
  ({
    ready: "Hazırdır",
    duplicate: "Təkrar — əlavə edilməyəcək",
    error: "Düzəliş tələb edir",
    created: "Əlavə edildi",
  })[s] || s;
export default function SalesImport({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null),
    [mapping, setMapping] = useState<Record<string, number | "">>({}),
    [results, setResults] = useState<Result[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [filename, setFilename] = useState("");
  async function request(body: FormData | object) {
    const form = body instanceof FormData;
    const r = await fetch("/api/admin/sales/import", {
      method: "POST",
      ...(form ? {} : { headers: { "Content-Type": "application/json" } }),
      body: form ? (body as FormData) : JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Əməliyyat alınmadı.");
    return d;
  }
  async function upload(file?: File, headerRow?: number) {
    if (!file) return;
    setBusy(true);
    setParsed(null);
    setResults([]);
    setSelected([]);
    setMessage("");
    setFilename(file.name);
    setUploadedFile(file);
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Fayl maksimum 2 MB ola bilər.");
      const fd = new FormData();
      fd.append("file", file);
      if (headerRow) fd.append("headerRow", String(headerRow));
      const d: Parsed = await request(fd);
      setParsed(d);
      const m: Record<string, number | ""> = {};
      for (const [key] of importFields) {
        const i = d.headers.findIndex((h) =>
          importAliases[key].includes(headerKey(h)),
        );
        m[key] = i < 0 ? "" : i;
      }
      setMapping(m);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Fayl oxunmadı.");
    } finally {
      setBusy(false);
    }
  }
  async function preview() {
    if (!parsed) return;
    setBusy(true);
    setResults([]);
    setSelected([]);
    setMessage("");
    const all: Result[] = [];
    const seenEmail = new Set<string>(),
      seenPhone = new Set<string>(),
      seenName = new Set<string>();
    try {
      for (let start = 0; start < parsed.rows.length; start += 25) {
        setMessage(`Yoxlanılır: ${start} / ${parsed.rows.length}`);
        const d = await request({
          action: "preview",
          mapping,
          rows: parsed.rows.slice(start, start + 25),
        });
        for (const r of d.results as Result[]) {
          r.index += start;
          if (r.status === "ready" && r.data) {
            const v = r.data,
              e = v.email?.toLowerCase(),
              p = v.phone ? phoneKey(v.phone) : "",
              n =
                v.title.toLowerCase() +
                "|" +
                (v.contactName || "").toLowerCase();
            if (
              (e && seenEmail.has(e)) ||
              (p && seenPhone.has(p)) ||
              (!e && !p && seenName.has(n))
            ) {
              r.status = "duplicate";
              r.duplicate = "Fayl daxilində təkrar";
            } else {
              if (e) seenEmail.add(e);
              if (p) seenPhone.add(p);
              seenName.add(n);
            }
          }
          all.push(r);
        }
      }
      setResults(all);
      setSelected(all.filter((r) => r.status === "ready").map((r) => r.index));
      setMessage(
        "Önizləməni yoxlayın və əlavə ediləcək sətirləri seçin. Mövcud məlumatlar dəyişdirilmir.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Yoxlama alınmadı.");
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (
      !parsed ||
      !selected.length ||
      !window.confirm(
        `${selected.length} potensial müştəri satış siyahısına əlavə edilsin? Təklif statusu “Təklif göndərilməlidir” olacaq. Məktub göndərilməyəcək.`,
      )
    )
      return;
    setBusy(true);
    const updated = [...results];
    let created = 0,
      duplicate = 0,
      errors = 0;
    try {
      for (let start = 0; start < selected.length; start += 25) {
        setMessage(`Əlavə olunur: ${start} / ${selected.length}`);
        const indexes = selected.slice(start, start + 25);
        const d = await request({
          action: "commit",
          confirm: true,
          mapping,
          rows: indexes.map((i) => parsed.rows[i]),
        });
        for (const result of d.results as Result[]) {
          const index = indexes[result.index],
            at = updated.findIndex((r) => r.index === index);
          updated[at] = { ...updated[at], ...result, index };
          if (result.status === "created") created++;
          else if (result.status === "duplicate") duplicate++;
          else errors++;
        }
        setResults([...updated]);
      }
      setSelected([]);
      setMessage(
        `${created} əlavə edildi · ${duplicate} təkrar buraxıldı · ${errors} xəta. ${errors ? "Problemli sətirləri faylda düzəldib yenidən yükləyə bilərsiniz." : ""}`,
      );
    } catch (e) {
      setSelected([]);
      setMessage(
        (e instanceof Error ? e.message : "Bağlantı xətası.") +
          " Saxlanmış sətirlər qorunur. “Önizləməni yoxla” ilə yenidən yoxlayın; təkrar idxal dublikat yaratmayacaq.",
      );
    } finally {
      setBusy(false);
      await onDone();
    }
  }
  const ready = results.filter((r) => r.status === "ready");
  return (
    <div className="salesDrawerBackdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="salesImportTitle"
        className="salesModal salesImportModal"
      >
        <div className="drawerHead">
          <div>
            <small>FAYLDAN İDXAL</small>
            <h3 id="salesImportTitle">Potensial müştəriləri əlavə et</h3>
            <p>1000 sətrədək · maksimum 2 MB · XLSX, DOCX və CSV</p>
          </div>
          <button disabled={busy} onClick={onClose} aria-label="Bağla">
            <X size={18} />
          </button>
        </div>
        <div className="drawerScroll">
          <p>
            Excel-in ilk vərəqi və ya Word-də başlıq sətri olan sadə cədvəl
            oxunur. Telefonları mətn formatında saxlayın. Köhnə .xls və .doc
            formatlarını əvvəlcə .xlsx və .docx kimi saxlayın.
          </p>
          <label className="drawerWide">
            Fayl seçin
            <input
              type="file"
              accept=".xlsx,.docx,.csv"
              disabled={busy}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          <p aria-live="polite">{message}</p>
          {parsed && uploadedFile && (
            <label className="drawerWide">
              Başlıq sətri
              <select
                aria-label="Başlıq sətri"
                disabled={busy}
                value={parsed.headerRow || 1}
                onChange={(e) => upload(uploadedFile, Number(e.target.value))}
              >
                {(parsed.headerRows || [parsed.headerRow || 1]).map(
                  (number) => (
                    <option key={number} value={number}>
                      {number}-ci sətir
                    </option>
                  ),
                )}
              </select>
              <span>
                Seçilmiş sətirdən əvvəlki başlıq və izahlar idxala daxil
                edilmir. Telefon hüceyrəsində bir neçə nömrə varsa ilk tam nömrə
                əsas əlaqə kimi, tam mətn isə qeyddə saxlanılır.
              </span>
            </label>
          )}
          {parsed && (
            <>
              <p>
                <strong>{filename}</strong> · {parsed.rows.length} sətir. Şirkət
                adı və ya əlaqə şəxsi sütunlarından ən az birini seçin.
                Telefon/e-poçt təkrarları mövcud satış siyahısına qarşı
                yoxlanır.
              </p>
              <div className="drawerGrid">
                {importFields.map(([key, title]) => (
                  <label key={key}>
                    {title}
                    <select
                      disabled={busy}
                      value={mapping[key] ?? ""}
                      onChange={(e) => {
                        setMapping({
                          ...mapping,
                          [key]:
                            e.target.value === "" ? "" : Number(e.target.value),
                        });
                        setResults([]);
                        setSelected([]);
                      }}
                    >
                      <option value="">İstifadə etmə</option>
                      {parsed.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button
                className="salesSecondary"
                disabled={
                  busy || (mapping.title === "" && mapping.contactName === "")
                }
                onClick={preview}
              >
                Önizləməni yoxla
              </button>
            </>
          )}
          {results.length > 0 && (
            <>
              <p>
                {ready.length} hazır ·{" "}
                {results.filter((r) => r.status === "duplicate").length} təkrar
                · {results.filter((r) => r.status === "error").length} xəta ·{" "}
                {results.filter((r) => r.status === "created").length} əlavə
                edildi
              </p>
              <label>
                <input
                  type="checkbox"
                  disabled={busy || !ready.length}
                  checked={
                    !!ready.length &&
                    ready.every((r) => selected.includes(r.index))
                  }
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? ready.map((r) => r.index) : [],
                    )
                  }
                />{" "}
                Hazır sətirlərin hamısını seç
              </label>
              <div className="salesImportTable">
                <table>
                  <thead>
                    <tr>
                      <th>Seç</th>
                      <th>Sətir</th>
                      <th>Şirkət / ad</th>
                      <th>E-poçt / telefon</th>
                      <th>Əlavə məlumat</th>
                      <th>Nəticə</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.index}>
                        <td>
                          <input
                            aria-label={`${parsed?.rowNumbers?.[r.index] ?? r.index + 2}-ci sətri seç`}
                            type="checkbox"
                            disabled={busy || r.status !== "ready"}
                            checked={selected.includes(r.index)}
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? [...selected, r.index]
                                  : selected.filter((i) => i !== r.index),
                              )
                            }
                          />
                        </td>
                        <td>{parsed?.rowNumbers?.[r.index] ?? r.index + 2}</td>
                        <td>
                          {r.data?.title ||
                            parsed?.rows[r.index]?.slice(0, 3).join(" · ")}
                          <br />
                          {r.data?.contactName}
                        </td>
                        <td>
                          {r.data?.email}
                          <br />
                          {r.data?.phone}
                        </td>
                        <td style={{ whiteSpace: "pre-wrap" }}>
                          {r.data?.notes}
                        </td>
                        <td>
                          {label(r.status)}
                          <br />
                          {r.error || r.duplicate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="drawerFoot">
          <button className="salesSecondary" disabled={busy} onClick={onClose}>
            Bağla
          </button>
          <button
            className="salesPrimary"
            disabled={busy || !selected.length}
            onClick={commit}
          >
            {busy ? "İşlənir…" : `${selected.length} sətri əlavə et`}
          </button>
        </div>
      </section>
      <style jsx>{`
        .salesImportModal {
          width: min(1050px, calc(100vw - 24px));
        }
        .salesImportModal p {
          font-size: 12px;
          line-height: 1.6;
        }
        .salesImportModal button:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .salesImportTable {
          overflow: auto;
          margin-top: 15px;
          max-height: 45vh;
        }
        .salesImportTable table {
          border-collapse: collapse;
          width: 100%;
          font-size: 12px;
        }
        .salesImportTable th,
        .salesImportTable td {
          text-align: left;
          border-bottom: 1px solid #8aa5b644;
          padding: 10px;
          vertical-align: top;
          min-width: 80px;
          max-width: 280px;
          overflow-wrap: anywhere;
        }
        .salesImportTable th {
          position: sticky;
          top: 0;
          background: #e9f4f6;
          color: #203946;
        }
        .salesImportTable input {
          width: 18px;
          height: 18px;
        }
        .drawerGrid {
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
}
