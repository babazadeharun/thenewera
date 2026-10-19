import { readXlsxXml } from "./xlsx-xml";
import { headerScore } from "./import-fields";
import { emailKey, phoneKey } from "./import-fields";
export { emailKey, phoneKey } from "./import-fields";
import ExcelJS from "exceljs";
import { SaxesParser } from "saxes";
import { inflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";

export class SalesImportError extends Error {}
function fail(message: string): never {
  throw new SalesImportError(message);
}
const LIMIT = 2 * 1024 * 1024;
export type ImportRow = {
  title: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  notes: string | null;
};
// Inspect central directory before decompressing Office archives. DOCX document
// decompression also has a hard output cap, independent of claimed ZIP sizes.
function zipEntries(b: Buffer) {
  let end = -1;
  for (let p = b.length - 22; p >= Math.max(0, b.length - 65557); p--) {
    if (
      b.readUInt32LE(p) === 0x06054b50 &&
      p + 22 + b.readUInt16LE(p + 20) === b.length
    ) {
      end = p;
      break;
    }
  }
  if (end < 0 || b.readUInt16LE(end + 4) !== 0 || b.readUInt16LE(end + 6) !== 0)
    fail("Office arxivi düzgün deyil.");
  const n = b.readUInt16LE(end + 10),
    offset = b.readUInt32LE(end + 16);
  if (n > 2000 || !n || b.readUInt16LE(end + 8) !== n || offset >= end)
    fail("Office arxivi həddindən böyükdür.");
  const files: {
    name: string;
    method: number;
    compressed: number;
    size: number;
    at: number;
    content: Buffer;
  }[] = [];
  let p = offset,
    total = 0;
  for (let i = 0; i < n; i++) {
    if (p + 46 > end || b.readUInt32LE(p) !== 0x02014b50)
      fail("Office arxivi zədələnib.");
    const flags = b.readUInt16LE(p + 8),
      method = b.readUInt16LE(p + 10),
      compressed = b.readUInt32LE(p + 20),
      size = b.readUInt32LE(p + 24),
      nameLength = b.readUInt16LE(p + 28),
      extra = b.readUInt16LE(p + 30),
      comment = b.readUInt16LE(p + 32),
      at = b.readUInt32LE(p + 42);
    total += size;
    if (
      flags & 1 ||
      total > 20 * 1024 * 1024 ||
      compressed === 0xffffffff ||
      at === 0xffffffff ||
      p + 46 + nameLength + extra + comment > end
    )
      fail("Şifrəli və ya açıldıqda 20 MB-dan böyük fayl qəbul edilmir.");
    files.push({
      name: b.subarray(p + 46, p + 46 + nameLength).toString("utf8"),
      method,
      compressed,
      size,
      at,
      content: Buffer.alloc(0),
    });
    p += 46 + nameLength + extra + comment;
  }
  let expanded = 0;
  for (const file of files) {
    const at = file.at;
    if (
      at + 30 > b.length ||
      b.readUInt32LE(at) !== 0x04034b50 ||
      b.readUInt16LE(at + 6) & 1
    )
      fail("Office arxivi zədələnib.");
    const start = at + 30 + b.readUInt16LE(at + 26) + b.readUInt16LE(at + 28);
    if (start + file.compressed > offset || ![0, 8].includes(file.method))
      fail("Office sıxılma formatı düzgün deyil.");
    const raw = b.subarray(start, start + file.compressed),
      content =
        file.method === 0
          ? raw
          : inflateRawSync(raw, {
              maxOutputLength: 20 * 1024 * 1024 - expanded + 1,
            });
    file.content = content;
    expanded += content.length;
    if (content.length !== file.size || expanded > 20 * 1024 * 1024)
      fail("Office faylının açılmış ölçüsü limiti keçir.");
  }
  return files;
}
function docx(b: Buffer) {
  const files = zipEntries(b),
    docs = files.filter((x) => x.name === "word/document.xml");
  if (docs.length !== 1) fail("DOCX sənədinin məzmunu tapılmadı.");
  const d = docs[0],
    at = d.at;
  if (at + 30 > b.length || b.readUInt32LE(at) !== 0x04034b50)
    fail("DOCX arxivi zədələnib.");
  const start = at + 30 + b.readUInt16LE(at + 26) + b.readUInt16LE(at + 28);
  if (start + d.compressed > b.length) fail("DOCX arxivi zədələnib.");
  const raw = b.subarray(start, start + d.compressed);
  if (d.method !== 0 && d.method !== 8)
    fail("DOCX sıxılma formatı dəstəklənmir.");
  const xml =
    d.method === 0
      ? raw
      : inflateRawSync(raw, { maxOutputLength: 20 * 1024 * 1024 });
  if (xml.length !== d.size || xml.length > 20 * 1024 * 1024)
    fail("DOCX ölçüsü düzgün deyil.");
  const rows: string[][] = [];
  let tableDepth = 0,
    row: string[] | null = null,
    cell: string | null = null,
    textDepth = 0;
  const parser = new SaxesParser({ xmlns: true });
  const word = (tag: any) =>
    [
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "http://purl.oclc.org/ooxml/wordprocessingml/main",
    ].includes(tag.uri);
  parser.on("doctype", () => fail("DTD olan sənəd qəbul edilmir."));
  parser.on("opentag", (tag) => {
    if (!word(tag)) return;
    if (tag.local === "tbl") {
      tableDepth++;
      if (tableDepth > 1)
        fail("İç-içə Word cədvəllərini sadə cədvələ çevirin.");
    }
    if (tableDepth === 1 && tag.local === "tr") row = [];
    if (row && tag.local === "tc") cell = "";
    if (cell !== null && tag.local === "t") textDepth++;
    if (cell !== null && ["br", "tab"].includes(tag.local)) cell += " ";
  });
  parser.on("text", (text) => {
    if (textDepth && cell !== null) {
      cell += text;
      if (cell.length > 20000) fail("Sahə maksimum 20000 simvol ola bilər.");
    }
  });
  parser.on("closetag", (tag) => {
    if (!word(tag)) return;
    if (tag.local === "t") textDepth = Math.max(0, textDepth - 1);
    if (tag.local === "p" && cell !== null) cell += " ";
    if (tag.local === "tc" && row && cell !== null) {
      row.push(cell.trim());
      cell = null;
      if (row.length > 100) fail("Maksimum 100 sütun.");
    }
    if (tag.local === "tr" && row) {
      if (row.some(Boolean)) rows.push(row);
      row = null;
      if (rows.length > 1001) fail("Maksimum 1000 məlumat sətri.");
    }
    if (tag.local === "tbl") tableDepth--;
  });
  parser.write(xml.toString("utf8")).close();
  if (!rows.length)
    fail(
      "Word faylında başlıq sətri olan cədvəl olmalıdır. Sərbəst mətn və köhnə .doc formatı dəstəklənmir.",
    );
  return rows;
}
function csv(text: string) {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/, 1)[0],
    sep = first.split(";").length > first.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!cell || quoted) quoted = !quoted;
      else fail("CSV dırnaq formatı düzgün deyil.");
    } else if (!quoted && (c === sep || c === "\r" || c === "\n")) {
      row.push(cell);
      cell = "";
      if (c !== sep) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
      }
    } else cell += c;
    if (cell.length > 20000 || row.length > 100 || rows.length > 1001)
      fail(
        "Maksimum 1000 məlumat sətri, 100 sütun və sahə başına 20000 simvol.",
      );
  }
  if (quoted) fail("CSV dırnağı bağlanmayıb.");
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
export async function parseSalesFile(
  bytes: Buffer,
  name: string,
  selectedHeader?: number,
) {
  if (bytes.length > LIMIT) fail("Fayl maksimum 2 MB ola bilər.");
  let rows: string[][] = [];
  if (/\.docx$/i.test(name)) rows = docx(bytes);
  else if (/\.csv$/i.test(name)) rows = csv(bytes.toString("utf8"));
  else if (/\.xlsx$/i.test(name)) {
    const files = zipEntries(bytes);
    const wb = new ExcelJS.Workbook();
    let loaded = false;
    try {
      await wb.xlsx.load(bytes as never);
      loaded = true;
    } catch {
      rows = readXlsxXml(files, fail);
    }
    if (loaded) {
      const sheet = wb.worksheets[0];
      if (!sheet) fail("Excel vərəqi tapılmadı.");
      if (sheet.rowCount > 1031 || sheet.columnCount > 100)
        fail("Maksimum 1000 məlumat sətri, 30 giriş sətri və 100 sütun.");
      sheet.eachRow((r) => {
        const values: string[] = [];
        for (let col = 1; col <= sheet.columnCount; col++) {
          const c = r.getCell(col);
          if (c.type === ExcelJS.ValueType.Formula)
            fail("Formulaları sadə dəyərlərə çevirin.");
          if (c.text.length > 20000)
            fail("Sahə maksimum 20000 simvol ola bilər.");
          values.push(c.text);
        }
        rows[r.number - 1] = values;
      });
    }
  } else
    fail(
      "XLSX, DOCX və ya CSV faylı seçin. Köhnə XLS və DOC fayllarını yeni formatda saxlayın.",
    );
  rows = Array.from({ length: rows.length }, (_, i) => rows[i] || []);
  if (rows.length < 2 || rows.length > 1031 || rows.some((r) => r.length > 100))
    fail("Başlıq və 1–1000 məlumat sətri olmalıdır.");
  let header = 0,
    score = headerScore(rows[0]);
  if (selectedHeader !== undefined) {
    if (
      !Number.isInteger(selectedHeader) ||
      selectedHeader < 1 ||
      selectedHeader > Math.min(30, rows.length - 1)
    )
      fail("Başlıq sətri düzgün deyil.");
    header = selectedHeader - 1;
  } else {
    for (let i = 1; i < Math.min(30, rows.length - 1); i++) {
      const candidate = headerScore(rows[i]);
      if (candidate >= 2 && candidate > score) {
        header = i;
        score = candidate;
      }
    }
  }
  if (!rows[header].some((x) => x.trim()))
    fail("Seçilmiş başlıq sətri boşdur.");
  const entries = rows
    .map((values, i) => ({ values, number: i + 1 }))
    .slice(header + 1)
    .filter((r) => r.values.some((x) => x.trim()));
  if (!entries.length || entries.length > 1000)
    fail("1–1000 məlumat sətri olmalıdır.");
  const width = Math.max(
    rows[header].length,
    ...entries.map((r) => r.values.length),
  );
  return {
    headers: Array.from(
      { length: width },
      (_, i) => rows[header][i]?.trim().slice(0, 100) || `Sütun ${i + 1}`,
    ),
    rows: entries.map((r) => r.values),
    rowNumbers: entries.map((r) => r.number),
    headerRow: header + 1,
    headerRows: rows
      .slice(0, Math.min(30, rows.length - 1))
      .flatMap((r, i) => (r.some((v) => v.trim()) ? [i + 1] : [])),
    maxHeaderRow: Math.min(30, rows.length - 1),
  };
}
export function mappedRow(raw: unknown, mapping: unknown): ImportRow {
  if (
    !Array.isArray(raw) ||
    raw.length > 100 ||
    !mapping ||
    typeof mapping !== "object" ||
    Array.isArray(mapping)
  )
    fail("Sətir və sütun uyğunluğu düzgün deyil.");
  const m = mapping as Record<string, unknown>;
  const get = (key: string, max = 500) => {
    const col = m[key];
    if (col === "" || col == null) return "";
    if (!Number.isInteger(col) || Number(col) < 0 || Number(col) >= 100)
      fail("Sütun seçimi düzgün deyil.");
    const value = String(raw[Number(col)] ?? "").trim();
    if (value.length > max) fail(`${key}: maksimum ${max} simvol.`);
    return value;
  };
  const contactName = get("contactName"),
    company = get("title"),
    emailInput = get("email", 254),
    phoneInput = get("phone", 500),
    instagram = get("instagram"),
    industry = get("industry"),
    source = get("source", 100),
    notes = get("notes", 20000);
  const absent = (value: string) =>
    [
      "bio-da tapılmadı",
      "bio-da yoxdur",
      "tapılmadı",
      "yoxdur",
      "qeyd edilməyib",
      "göstərilməyib",
      "n/a",
      "-",
      "—",
    ].includes(value.trim().toLowerCase());
  const email = absent(emailInput) ? "" : emailKey(emailInput);
  const phoneText = absent(phoneInput) ? "" : phoneInput;
  const phones = phoneText.match(/\+?\d[\d ()\u00a0.\-]*\d/g) || [];
  const normalPhones = phones.filter(
    (value) => phoneKey(value).length >= 7 && phoneKey(value).length <= 15,
  );
  const hotlineOnly = /^(?:\*?\d{3,6}|0\d{2}\s+\d{3})$/.test(phoneText);
  const phone = normalPhones[0]?.trim() || (hotlineOnly ? "" : phoneText);
  const title = company || contactName;
  if (!title) fail("Şirkət / satış adı və ya əlaqə şəxsi tələb olunur.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail("E-poçt ünvanı düzgün deyil.");
  if (phone && (phoneKey(phone).length < 7 || phoneKey(phone).length > 15))
    fail("Telefon nömrəsi düzgün deyil.");
  return {
    title,
    contactName: contactName || null,
    email: email || null,
    phone: phone || null,
    source: source || null,
    notes:
      [
        instagram && `Instagram: ${instagram}`,
        industry && `Fəaliyyət sahəsi: ${industry}`,
        get("address") && `Klinika / ünvan: ${get("address")}`,
        get("evidence") && `Ərazi qeydi: ${get("evidence")}`,
        get("profileUrl") && `Profil linki: ${get("profileUrl")}`,
        emailInput && absent(emailInput) && `E-poçt qeydi: ${emailInput}`,
        phoneInput &&
          (absent(phoneInput) || phones.length > 1 || phone !== phoneInput) &&
          `Telefon məlumatı: ${phoneInput}`,
        notes,
      ]
        .filter(Boolean)
        .join("\n") || null,
  };
}
export function importId(row: ImportRow) {
  return (
    "sales_import_" +
    createHash("sha256").update(JSON.stringify(row)).digest("hex").slice(0, 40)
  );
}
export function duplicateOf(
  row: ImportRow,
  existing: {
    id: string;
    title: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
  }[],
) {
  return existing.find(
    (d) =>
      d.id === importId(row) ||
      (row.email && emailKey(d.email) === emailKey(row.email)) ||
      (row.phone && phoneKey(d.phone) === phoneKey(row.phone)) ||
      (!row.email &&
        !row.phone &&
        d.title.trim().toLowerCase() === row.title.toLowerCase() &&
        (d.contactName || "").trim().toLowerCase() ===
          (row.contactName || "").toLowerCase()),
  );
}
