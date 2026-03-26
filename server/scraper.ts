import * as cheerio from 'cheerio';
import type { DocumentInfo } from '../src/types/index.js';

const BASE_URL = 'https://iawpa.horsham.gov.uk/PublicAccess_LIVE';
const SEARCH_URL = `${BASE_URL}/SearchResult/RunThirdPartySearch?FileSystemId=DH&FOLDER1_REF=`;

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
      'Accept-Encoding': 'gzip, deflate, br',
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

/**
 * Detect column indices from thead headers.
 * Expected columns from the Horsham portal:
 *   0: checkbox, 1: View (icon), 2: Document Type, 3: Date Received, 4: Name or Detail
 */
function detectColumns($: cheerio.CheerioAPI): {
  typeCol: number;
  dateCol: number;
  nameCol: number;
} {
  // Defaults based on known Horsham portal layout
  let typeCol = 2;
  let dateCol = 3;
  let nameCol = 4;

  $('table thead th, table thead td').each((i, th) => {
    const text = $(th).text().trim().toLowerCase();
    if (text.includes('document type') || text === 'type') {
      typeCol = i;
    } else if (text.includes('date')) {
      dateCol = i;
    } else if (
      text.includes('name') ||
      text.includes('detail') ||
      text.includes('description')
    ) {
      nameCol = i;
    }
  });

  return { typeCol, dateCol, nameCol };
}

export async function scrapeDocuments(reference: string): Promise<DocumentInfo[]> {
  const url = SEARCH_URL + encodeURIComponent(reference);
  console.log(`Fetching documents from: ${url}`);

  const html = await fetchPage(url);

  console.log(`Received HTML length: ${html.length} characters`);

  const $ = cheerio.load(html);
  const documents: DocumentInfo[] = [];

  // Detect column layout from table headers
  const { typeCol, dateCol, nameCol } = detectColumns($);
  console.log(`Detected columns - type: ${typeCol}, date: ${dateCol}, name: ${nameCol}`);

  // Count total rows for logging
  const allRows = $('table tbody tr');
  console.log(`Found ${allRows.length} total table rows`);

  // Parse each table row
  allRows.each((_i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const docType = cells.eq(typeCol).text().trim();
    const date = cells.eq(dateCol).text().trim();
    const name = cells.eq(nameCol).text().trim();

    // Find the document view link - look in the View column (usually col 1)
    // or any cell that has a link to a document
    let docUrl = '';
    cells.each((_j, cell) => {
      $(cell)
        .find('a')
        .each((_k, link) => {
          const href = $(link).attr('href') || '';
          if (href && !docUrl) {
            docUrl = href.startsWith('http')
              ? href
              : href.startsWith('/')
                ? `https://iawpa.horsham.gov.uk${href}`
                : `${BASE_URL}/${href}`;
          }
        });
    });

    if (isRelevantDocType(docType)) {
      documents.push({
        title: name || docType,
        type: docType,
        date: date || 'Unknown',
        url: docUrl,
      });
    }
  });

  console.log(`Found ${documents.length} relevant documents for ${reference}`);

  // If no rows were found in the table, the page might use DataTables
  // server-side processing. Log diagnostic info.
  if (allRows.length === 0) {
    console.log('No table rows found. Page might use client-side rendering.');
    console.log('Page title:', $('title').text());
    console.log('Tables found:', $('table').length);
    console.log(
      'First 2000 chars of HTML:',
      html.substring(0, 2000)
    );
  }

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
