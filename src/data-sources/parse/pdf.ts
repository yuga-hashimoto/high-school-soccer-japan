import { extractText, getDocumentProxy } from "unpdf";
import { NeedsParserError } from "../errors";

export const PDF_PARSER_VERSION = "pdf@2.0.0";

/**
 * Extracts the embedded text layer from a PDF. OCR is deliberately not used:
 * the first choice is always the text the association itself embedded, and a
 * scanned PDF (no text layer) fails loudly so the source can be recorded as
 * `NEEDS_PARSER` instead of producing garbage.
 */
export async function extractPdfText(
  bytes: Buffer,
  sourceId: string,
  sourceUrl: string,
): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    const result = Array.isArray(text) ? text.join("\n") : text;
    if (result.replace(/\s/g, "").length === 0) {
      throw new NeedsParserError(
        sourceId,
        sourceUrl,
        "PDFにテキストレイヤーがありません（スキャン画像の可能性）",
      );
    }
    return normalizePdfText(result);
  } catch (error) {
    if (error instanceof NeedsParserError) throw error;
    throw new NeedsParserError(
      sourceId,
      sourceUrl,
      `PDFのテキスト抽出に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export interface PdfItem {
  text: string;
  x: number;
  y: number;
  page: number;
}

/**
 * Returns the text layer with coordinates so that real tables (standings
 * published as PDF) can be reconstructed by position.
 */
export async function extractPdfLayout(
  bytes: Buffer,
  sourceId: string,
  sourceUrl: string,
): Promise<PdfItem[]> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const out: PdfItem[] = [];
    for (let page = 1; page <= pdf.numPages; page += 1) {
      const pdfPage = await pdf.getPage(page);
      const content = await pdfPage.getTextContent();
      for (const item of content.items) {
        if (!("str" in item) || !("transform" in item)) continue;
        const transform = item.transform as number[];
        out.push({
          text: item.str as string,
          x: transform[4],
          y: transform[5],
          page,
        });
      }
    }
    if (out.length === 0) {
      throw new NeedsParserError(sourceId, sourceUrl, "PDFにテキストレイヤーがありません");
    }
    return out;
  } catch (error) {
    if (error instanceof NeedsParserError) throw error;
    throw new NeedsParserError(
      sourceId,
      sourceUrl,
      `PDFのレイアウト抽出に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/** Collapses the wide gaps PDF extraction inserts between table columns. */
function normalizePdfText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u3000\u00a0]/g, " ")
    .replace(/[ \t]{2,}/g, "  ")
    .replace(/\n{3,}/g, "\n\n");
}
