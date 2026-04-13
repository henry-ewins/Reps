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

export interface ModelRow {
  Guid: string;
  Doc_Type: string;
  Date_Received: string;
  Doc_Ref2: string;
}

interface PageModel {
  FlexibleColumns: { Column: string; ColumnHeader: string; ColumnType: string }[];
  Rows: ModelRow[];
}

function extractModel(html: string): PageModel | null {
  const marker = 'var model =';
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    console.error('Could not find "var model =" in HTML');
    return null;
  }

  const jsonStart = html.indexOf('{', markerIndex + marker.length);
  if (jsonStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const jsonStr = html.substring(jsonStart, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          console.error('Failed to parse model JSON:', e);
          return null;
        }
      }
    }
  }

  console.error('Could not find matching closing brace for model JSON');
  return null;
}

function formatDate(raw: string): string {
  if (!raw) return 'Unknown';
  const parts = raw.split(' ')[0]?.split('/');
  if (parts && parts.length === 3) {
    return `${parts[1]}/${parts[0]}/${parts[2]}`;
  }
  return raw;
}

export interface ScrapeResult {
  documents: DocumentInfo[];
  allRows: ModelRow[];
}

export async function scrapeDocuments(reference: string): Promise<ScrapeResult> {
  const url = SEARCH_URL + encodeURIComponent(reference);
  console.log(`Fetching documents from: ${url}`);

  const html = await fetchPage(url);
  console.log(`Received HTML length: ${html.length} characters`);

  const model = extractModel(html);

  if (!model) {
    console.error('Could not extract model data from page');
    return { documents: [], allRows: [] };
  }

  console.log(`Model contains ${model.Rows.length} total documents`);

  const documents: DocumentInfo[] = model.Rows
    .filter((row) => isRelevantDocType(row.Doc_Type))
    .map((row) => ({
      title: row.Doc_Ref2 || row.Doc_Type,
      type: row.Doc_Type,
      date: formatDate(row.Date_Received),
      url: `${BASE_URL}/SearchResult/RunThirdPartySearch?FileSystemId=DH&FOLDER1_REF=${encodeURIComponent(reference)}`,
    }));

  console.log(`Found ${documents.length} relevant documents for ${reference}`);

  return { documents, allRows: model.Rows };
}
