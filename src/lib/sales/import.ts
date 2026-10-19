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
  const files = [];
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
export async function parseSalesFile(bytes: Buffer, name: string) {
  if (bytes.length > LIMIT) fail("Fayl maksimum 2 MB ola bilər.");
  let rows: string[][] = [];
  if (/\.docx$/i.test(name)) rows = docx(bytes);
  else if (/\.csv$/i.test(name)) rows = csv(bytes.toString("utf8"));
  else if (/\.xlsx$/i.test(name)) {
    zipEntries(bytes);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as never);
    const sheet = wb.worksheets[0];
    if (!sheet) fail("Excel vərəqi tapılmadı.");
    if (sheet.rowCount > 1001 || sheet.columnCount > 100)
      fail("Maksimum 1000 məlumat sətri və 100 sütun.");
    sheet.eachRow((r) => {
      const values = [];
      for (let col = 1; col <= sheet.columnCount; col++) {
        const c = r.getCell(col);
        if (c.type === ExcelJS.ValueType.Formula)
          fail("Formulaları sadə dəyərlərə çevirin.");
        if (c.text.length > 20000)
          fail("Sahə maksimum 20000 simvol ola bilər.");
        values.push(c.text);
      }
      rows.push(values);
    });
  } else
    fail(
      "XLSX, DOCX və ya CSV faylı seçin. Köhnə XLS və DOC fayllarını yeni formatda saxlayın.",
    );
  if (rows.length < 2 || rows.length > 1001 || rows.some((r) => r.length > 100))
    fail("Başlıq və 1–1000 məlumat sətri olmalıdır.");
  return {
    headers: rows[0].map((x, i) => x.trim().slice(0, 100) || `Sütun ${i + 1}`),
    rows: rows.slice(1),
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
    email = emailKey(get("email", 254)),
    phone = get("phone", 80),
    instagram = get("instagram"),
    industry = get("industry"),
    source = get("source", 100),
    notes = get("notes", 20000);
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
