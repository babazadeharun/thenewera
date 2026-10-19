import { SaxesParser } from "saxes";
import { posix } from "node:path";
const spreadsheet = new Set([
  "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
  "http://purl.oclc.org/ooxml/spreadsheetml/main",
]);
const officeRel = new Set([
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  "http://purl.oclc.org/ooxml/officeDocument/relationships",
]);
// Namespace-aware fallback for valid prefixed SpreadsheetML documents that
// ExcelJS cannot load. It never evaluates formulas or follows external links.
export function readXlsxXml(
  files: { name: string; content: Buffer }[],
  fail: (message: string) => never,
) {
  function part(name: string, optional = false) {
    const matches = files.filter((f) => f.name === name);
    if (matches.length > 1 || (!matches.length && !optional))
      fail("Excel sənədinin tələb olunan hissəsi tapılmadı.");
    return matches[0]?.content.toString("utf8") || "";
  }
  function parse(
    xml: string,
    open: (tag: any) => void,
    text: (value: string) => void,
    close: (tag: any) => void,
  ) {
    const p = new SaxesParser({ xmlns: true });
    p.on("doctype", () => fail("DTD olan Excel sənədi qəbul edilmir."));
    p.on("opentag", open);
    p.on("text", text);
    p.on("closetag", close);
    p.write(xml).close();
  }
  let firstId = "";
  parse(
    part("xl/workbook.xml"),
    (tag) => {
      if (spreadsheet.has(tag.uri) && tag.local === "sheet" && !firstId) {
        const id = Object.values(tag.attributes).find(
          (a: any) => a.local === "id" && officeRel.has(a.uri),
        ) as any;
        firstId = id?.value || "";
      }
    },
    () => {},
    () => {},
  );
  if (!firstId) fail("Excel vərəqi tapılmadı.");
  const relationships: { id: string; type: string; target: string }[] = [];
  parse(
    part("xl/_rels/workbook.xml.rels"),
    (tag) => {
      if (
        tag.local !== "Relationship" ||
        tag.uri !==
          "http://schemas.openxmlformats.org/package/2006/relationships"
      )
        return;
      const a = (name: string) => tag.attributes[name]?.value || "";
      if (a("TargetMode") === "External") return;
      relationships.push({ id: a("Id"), type: a("Type"), target: a("Target") });
    },
    () => {},
    () => {},
  );
  const resolve = (target: string) => {
    if (!target || /[\\?#]/.test(target))
      fail("Excel daxili keçidi düzgün deyil.");
    const normalized = posix.normalize(
      target.startsWith("/") ? target.slice(1) : posix.join("xl", target),
    );
    if (normalized.startsWith("../") || normalized.startsWith("/"))
      fail("Excel daxili keçidi düzgün deyil.");
    return normalized;
  };
  const sheet = relationships.find(
    (r) => r.id === firstId && r.type.endsWith("/worksheet"),
  );
  if (!sheet) fail("Excel vərəqinin bağlantısı tapılmadı.");
  const shared = relationships.find((r) => r.type.endsWith("/sharedStrings"));
  const strings: string[] = [];
  let insideString = false,
    inText = false,
    value = "";
  const stringsXml = shared
    ? part(resolve(shared.target))
    : part("xl/sharedStrings.xml", true);
  if (stringsXml)
    parse(
      stringsXml,
      (tag) => {
        if (!spreadsheet.has(tag.uri)) return;
        if (tag.local === "si") {
          insideString = true;
          value = "";
        }
        if (tag.local === "t" && insideString) inText = true;
      },
      (text) => {
        if (inText) {
          value += text;
          if (value.length > 20000)
            fail("Sahə maksimum 20000 simvol ola bilər.");
        }
      },
      (tag) => {
        if (!spreadsheet.has(tag.uri)) return;
        if (tag.local === "t") inText = false;
        if (tag.local === "si") {
          strings.push(value);
          insideString = false;
        }
      },
    );
  const rows: string[][] = [];
  let row: string[] | null = null,
    rowNumber = 0,
    col = 0,
    cellType = "",
    cellValue = "",
    inline = "",
    inValue = false,
    inInline = false;
  parse(
    part(resolve(sheet.target)),
    (tag) => {
      if (!spreadsheet.has(tag.uri)) return;
      if (tag.local === "row") {
        rowNumber = Number(tag.attributes.r?.value || rowNumber + 1);
        if (
          !Number.isInteger(rowNumber) ||
          rowNumber < 1 ||
          rowNumber > 1031 ||
          rows[rowNumber - 1]
        )
          fail(
            "Excel maksimum 1000 məlumat sətri və 30 giriş sətri ehtiva edə bilər.",
          );
        row = [];
        col = 0;
      }
      if (tag.local === "c" && row) {
        const ref = tag.attributes.r?.value as string | undefined;
        if (ref) {
          const match = /^([A-Z]+)(\d+)$/.exec(ref);
          if (!match || Number(match[2]) !== rowNumber)
            fail("Excel hüceyrə ünvanı düzgün deyil.");
          col = 0;
          for (const letter of match[1])
            col = col * 26 + letter.charCodeAt(0) - 64;
        } else col++;
        if (col < 1 || col > 100) fail("Maksimum 100 sütun.");
        cellType = tag.attributes.t?.value || "";
        cellValue = "";
        inline = "";
      }
      if (row && tag.local === "f")
        fail("Formulaları əvvəlcə sadə dəyərlərə çevirin.");
      if (row && tag.local === "v") inValue = true;
      if (row && tag.local === "t") inInline = true;
    },
    (text) => {
      if (inValue) cellValue += text;
      if (inInline) inline += text;
      if (cellValue.length > 20000 || inline.length > 20000)
        fail("Sahə maksimum 20000 simvol ola bilər.");
    },
    (tag) => {
      if (!spreadsheet.has(tag.uri)) return;
      if (tag.local === "v") inValue = false;
      if (tag.local === "t") inInline = false;
      if (tag.local === "c" && row) {
        let cell = cellType === "inlineStr" ? inline : cellValue;
        if (cellType === "s") {
          const i = Number(cellValue);
          if (
            !/^\d+$/.test(cellValue) ||
            !Number.isInteger(i) ||
            i >= strings.length
          )
            fail("Excel mətn istinadı düzgün deyil.");
          cell = strings[i];
        }
        if (cellType === "e") fail("Excel-də xəta dəyəri olan hüceyrə var.");
        row[col - 1] = cell;
      }
      if (tag.local === "row" && row) {
        rows[rowNumber - 1] = row;
        row = null;
      }
    },
  );
  return Array.from({ length: rows.length }, (_, i) =>
    Array.from({ length: rows[i]?.length || 0 }, (_, j) => rows[i]?.[j] || ""),
  );
}
