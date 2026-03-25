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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
