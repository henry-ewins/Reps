import type { DocumentInfo } from '../src/types/index.js';

const BASE_URL = 'https://iawpa.horsham.gov.uk/PublicAccess_LIVE';
const SEARCH_URL = `${BASE_URL}/SearchResult/RunThirdPartySearch?FileSystemId=DH&FOLDER1_REF=`;
const DOC_VIEW_URL = `${BASE_URL}/SearchResult/RunThirdPartySearchDocumentSummary?FileSystemId=DH&Serial=`;

const RELEVANT_DOC_TYPES = [
  'representation letter',
  'consultation response',
];

function isRelevantDocType(docType: string): boolean {
  const lower = docType.toLowerCase().trim();
  return RELEVANT_DOC_TYPES.some((t) => lower.includes(t));
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

interface ModelRow {
  Guid: string;
  Doc_Type: string;
  Date_Received: string;
  Doc_Ref2: string;
}

interface PageModel {
  FlexibleColumns: { Column: string; ColumnHeader: string; ColumnType: string }[];
  Rows: ModelRow[];
}

/**
 * Extract the `var model = {...}` JSON from the page's inline script.
 * The Horsham portal renders all document data as a JS variable that
 * DataTables consumes client-side (no <tbody> rows in the HTML).
 */
function extractModel(html: string): PageModel | null {
  // Match "var model =" followed by a JSON object
  const match = html.match(/var\s+model\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch (e) {
    console.error('Failed to parse model JSON:', e);
    return null;
  }
}

/**
 * Format the raw date string from the model.
 * Input format: "03/19/2026 00:00:00" (MM/DD/YYYY)
 * Output format: "19/03/2026" (DD/MM/YYYY for UK display)
 */
function formatDate(raw: string): string {
  if (!raw) return 'Unknown';
  const parts = raw.split(' ')[0]?.split('/');
  if (parts && parts.length === 3) {
    return `${parts[1]}/${parts[0]}/${parts[2]}`; // DD/MM/YYYY
  }
  return raw;
}

export async function scrapeDocuments(reference: string): Promise<DocumentInfo[]> {
  const url = SEARCH_URL + encodeURIComponent(reference);
  console.log(`Fetching documents from: ${url}`);

  const html = await fetchPage(url);
  console.log(`Received HTML length: ${html.length} characters`);

  // Extract the JavaScript model variable containing all document data
  const model = extractModel(html);

  if (!model) {
    console.error('Could not extract model data from page');
    console.log('First 3000 chars:', html.substring(0, 3000));
    return [];
  }

  console.log(`Model contains ${model.Rows.length} total documents`);

  // Filter for relevant document types
  const documents: DocumentInfo[] = model.Rows
    .filter((row) => isRelevantDocType(row.Doc_Type))
    .map((row) => ({
      title: row.Doc_Ref2 || row.Doc_Type,
      type: row.Doc_Type,
      date: formatDate(row.Date_Received),
      url: `${DOC_VIEW_URL}${row.Guid}`,
    }));

  console.log(`Found ${documents.length} relevant documents (representation letters + consultation responses) for ${reference}`);

  return documents;
}

export async function fetchDocumentText(
  documents: DocumentInfo[]
): Promise<DocumentInfo[]> {
  const results: DocumentInfo[] = [];

  // Process documents in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    console.log(`Fetching document batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}...`);

    const batchResults = await Promise.all(
      batch.map(async (doc) => {
        if (!doc.url) {
          return { ...doc, text: doc.title };
        }

        try {
          const response = await fetch(doc.url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
            },
            redirect: 'follow',
          });

          const contentType = response.headers.get('content-type') || '';

          if (contentType.includes('application/pdf')) {
            const buffer = Buffer.from(await response.arrayBuffer());
            try {
              const pdfParse = (await import('pdf-parse')).default;
              const data = await pdfParse(buffer);
              return { ...doc, text: data.text };
            } catch {
              console.warn(`Could not parse PDF for ${doc.title}`);
              return { ...doc, text: `[PDF document: ${doc.title}]` };
            }
          } else {
            const html = await response.text();
            // Check if the response redirects to a PDF or document viewer
            if (html.includes('application/pdf') || html.includes('.pdf')) {
              // Try to find a PDF link in the response
              const pdfMatch = html.match(/href=["']([^"']*\.pdf[^"']*)/i);
              if (pdfMatch) {
                const pdfUrl = pdfMatch[1].startsWith('http')
                  ? pdfMatch[1]
                  : `https://iawpa.horsham.gov.uk${pdfMatch[1]}`;
                try {
                  const pdfResponse = await fetch(pdfUrl, {
                    headers: {
                      'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                  });
                  const buffer = Buffer.from(await pdfResponse.arrayBuffer());
                  const pdfParse = (await import('pdf-parse')).default;
                  const data = await pdfParse(buffer);
                  return { ...doc, text: data.text };
                } catch {
                  // Fall through to HTML parsing
                }
              }
            }

            // Parse as HTML page
            const cheerio = await import('cheerio');
            const $ = cheerio.load(html);
            $('script, style, nav, header, footer').remove();
            const text = $('body').text().replace(/\s+/g, ' ').trim();
            return { ...doc, text: text.substring(0, 10000) };
          }
        } catch (error) {
          console.warn(`Could not fetch document ${doc.title}:`, error);
          return { ...doc, text: `[Could not retrieve: ${doc.title}]` };
        }
      })
    );
    results.push(...batchResults);
  }

  return results;
}
