# HDC Planning - Representation Summary

A tool that searches the Horsham District Council public planning portal for representation letters and consultation responses, then uses AI to generate categorised summaries for planning officers.

## Features

- Search by planning reference number (e.g. DC/26/0271)
- Scrapes the HDC PublicAccess portal for Representation Letters and Consultation Responses
- AI-powered categorisation into Objection / Support / Neutral
- Representation Summary table with paragraph summaries per category
- Officer's Report section with bullet-point grounds (copy-ready)
- Keyword cloud showing most frequent planning terms
- GDPR compliant - automatically filters personal data from summaries

## Setup

```bash
npm install
```

Create a `.env` file with your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## Development

```bash
npm run dev
```

This starts both the Vite dev server (frontend) and the Express API server concurrently.

- Frontend: http://localhost:5173
- API server: http://localhost:3001

## How it works

1. Enter a planning reference (e.g. `DC/26/0271`)
2. The backend fetches the document list from the Horsham PublicAccess portal
3. It filters for documents of type "Representation letter" or "Consultation response"
4. Document content is extracted (supports HTML pages and PDFs)
5. Claude AI analyses and categorises the representations
6. Results are displayed with stats, summaries, officer report text, and keyword cloud
