import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { scrapeDocuments, fetchDocumentText } from './scraper.js';
import { summarizeRepresentations } from './summarizer.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/process', async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      res.status(400).json({ error: 'Planning reference is required' });
      return;
    }

    // Step 1: Scrape documents from Horsham portal
    const documents = await scrapeDocuments(reference);

    if (documents.length === 0) {
      res.status(404).json({
        error: 'No representation letters or consultation responses found for this reference.',
      });
      return;
    }

    // Step 2: Fetch text content from each document
    const documentsWithText = await fetchDocumentText(documents);

    // Step 3: Use AI to summarize and categorize
    const result = await summarizeRepresentations(reference, documentsWithText);

    res.json(result);
  } catch (error: unknown) {
    console.error('Processing error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred processing the reference';
    res.status(500).json({ error: message });
  }
});

// Debug endpoint - returns raw HTML from the portal for a reference
app.post('/api/debug', async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      res.status(400).json({ error: 'Planning reference is required' });
      return;
    }

    const url = `https://iawpa.horsham.gov.uk/PublicAccess_LIVE/SearchResult/RunThirdPartySearch?FileSystemId=DH&FOLDER1_REF=${encodeURIComponent(reference)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
    });

    const html = await response.text();
    res.json({
      status: response.status,
      url,
      htmlLength: html.length,
      // Show first 5000 chars and last 2000 chars
      htmlStart: html.substring(0, 5000),
      htmlEnd: html.substring(Math.max(0, html.length - 2000)),
      // Try to find table structure
      hasTable: html.includes('<table'),
      hasDataTable: html.includes('dataTable') || html.includes('DataTable'),
      hasTbody: html.includes('<tbody'),
      tableCount: (html.match(/<table/g) || []).length,
      trCount: (html.match(/<tr/g) || []).length,
      // Check for document type text
      hasRepresentationLetter: html.toLowerCase().includes('representation letter'),
      hasConsultationResponse: html.toLowerCase().includes('consultation response'),
    });
  } catch (error: unknown) {
    console.error('Debug error:', error);
    const message = error instanceof Error ? error.message : 'Debug request failed';
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
