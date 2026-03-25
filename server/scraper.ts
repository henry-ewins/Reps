import * as cheerio from 'cheerio';
import type { DocumentInfo } from '../src/types/index.js';

const BASE_URL = 'https://iawpa.horsham.gov.uk/PublicAccess_LIVE';
const SEARCH_URL = `${BASE_URL}/SearchResult/RunThirdPartySearch?FileSystemId=DH&FOLDER1_REF=`;

const RELEVANT_DOC_TYPES = [
  'representation letter',
  'consultation response',
  'representation',
  'public comment',
  'neighbour letter',
  'third party letter',
];

function isRelevantDocType(docType: string): boolean {
  const lower = docType.toLowerCase().trim();
  return RELEVANT_DOC_TYPES.some((t) => lower.includes(t));
}

export async function scrapeDocuments(reference: string): Promise<DocumentInfo[]> {
  const url = SEARCH_URL + encodeURIComponent(reference);
  console.log(`Fetching documents from: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const documents: DocumentInfo[] = [];

  // Idox PublicAccess typically renders documents in a table or list
  // Try multiple selectors to find document entries
  $('table tbody tr, .searchResultsTable tr, #ResultList tr').each((_i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;

    // Extract document type, description, date, and link
    let docType = '';
    let title = '';
    let date = '';
    let docUrl = '';

    // Try common Idox column layouts
    cells.each((j, cell) => {
      const text = $(cell).text().trim();
      const headerText = $('table thead th').eq(j).text().trim().toLowerCase();

      if (headerText.includes('type') || headerText.includes('document type')) {
        docType = text;
      } else if (headerText.includes('description') || headerText.includes('title')) {
        title = text;
      } else if (headerText.includes('date')) {
        date = text;
      }

      // Look for links in the cell
      const link = $(cell).find('a').attr('href');
      if (link) {
        docUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
        if (!title) title = $(cell).find('a').text().trim();
      }
    });

    // Fallback: try to get type from text content
    if (!docType) {
      const rowText = $(row).text().toLowerCase();
      for (const t of RELEVANT_DOC_TYPES) {
        if (rowText.includes(t)) {
          docType = t;
          break;
        }
      }
    }

    // Also try to extract from specific class-based layouts
    if (!docType) {
      docType = $(row).find('.documentType, [data-type]').text().trim();
    }
    if (!title) {
      title = $(row).find('.documentDescription, [data-description]').text().trim();
    }
    if (!date) {
      date = $(row).find('.documentDate, [data-date]').text().trim();
    }

    if (isRelevantDocType(docType) || (!docType && title && isRelevantDocType(title))) {
      documents.push({
        title: title || docType,
        type: docType || 'Representation',
        date: date || 'Unknown',
        url: docUrl,
      });
    }
  });

  // Also try alternative page structures (some Idox versions use divs)
  if (documents.length === 0) {
    $('.resultItem, .document-row, .fileItem').each((_i, item) => {
      const docType =
        $(item).find('.fileType, .documentType, .type').text().trim() ||
        $(item).attr('data-type') ||
        '';
      const title =
        $(item).find('.fileDescription, .documentDescription, .title, a').first().text().trim();
      const date = $(item).find('.fileDate, .documentDate, .date').text().trim();
      const link = $(item).find('a').attr('href') || '';
      const docUrl = link.startsWith('http') ? link : link ? `${BASE_URL}${link}` : '';

      if (isRelevantDocType(docType) || isRelevantDocType(title)) {
        documents.push({
          title: title || docType,
          type: docType || 'Representation',
          date: date || 'Unknown',
          url: docUrl,
        });
      }
    });
  }

  console.log(`Found ${documents.length} relevant documents for ${reference}`);
  return documents;
}

export async function fetchDocumentText(
  documents: DocumentInfo[]
): Promise<DocumentInfo[]> {
  const results: DocumentInfo[] = [];

  for (const doc of documents) {
    if (!doc.url) {
      results.push({ ...doc, text: doc.title });
      continue;
    }

    try {
      const response = await fetch(doc.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/pdf')) {
        // For PDFs, we'd need pdf-parse but it requires the buffer
        const buffer = Buffer.from(await response.arrayBuffer());
        try {
          const pdfParse = (await import('pdf-parse')).default;
          const data = await pdfParse(buffer);
          results.push({ ...doc, text: data.text });
        } catch {
          console.warn(`Could not parse PDF for ${doc.title}`);
          results.push({ ...doc, text: `[PDF document: ${doc.title}]` });
        }
      } else {
        // HTML document page - extract text
        const html = await response.text();
        const $ = cheerio.load(html);
        // Remove scripts and styles
        $('script, style, nav, header, footer').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        results.push({ ...doc, text: text.substring(0, 10000) });
      }
    } catch (error) {
      console.warn(`Could not fetch document ${doc.title}:`, error);
      results.push({ ...doc, text: `[Could not retrieve: ${doc.title}]` });
    }
  }

  return results;
}
