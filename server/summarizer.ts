import Anthropic from '@anthropic-ai/sdk';
import type { DocumentInfo } from '../src/types/index.js';
import type { ProcessingResult, CommentStats, KeywordEntry } from '../src/types/index.js';
import type { ModelRow } from './scraper.js';

const anthropic = new Anthropic();

export async function summarizeRepresentations(
  reference: string,
  documents: DocumentInfo[],
  allRows: ModelRow[]
): Promise<ProcessingResult> {
  // Compute stats directly from document metadata
  const repLetters = documents.filter(
    (d) => d.type.toLowerCase().includes('representation letter')
  );
  const consultations = documents.filter(
    (d) => d.type.toLowerCase().includes('consultation response')
  );

  const stats: CommentStats = {
    total: documents.length,
    objections: 0,
    support: 0,
    neutral: 0,
  };

  // Build document listing for AI analysis
  const documentList = documents
    .map(
      (doc, i) =>
        `${i + 1}. [${doc.type}] ${doc.title} (received ${doc.date})`
    )
    .join('\n');

  // Also list all document types on the application for context
  const allDocTypes = allRows
    .map((r) => `- ${r.Doc_Type}: ${r.Doc_Ref2}`)
    .join('\n');

  const prompt = `You are an expert UK planning officer assistant analysing representations for planning application ${reference}.

The public portal shows the following ${documents.length} representation letters and consultation responses:

${documentList}

Additional context - all documents on the application:
${allDocTypes}

Based on the document types and sources listed above, provide your analysis. Representation letters from residential addresses are typically objections or support from neighbours. Consultation responses are typically neutral technical responses from statutory consultees (e.g. parish councils, drainage authorities, highways, Natural England, Historic England, environmental health).

IMPORTANT: Filter out personal data (names, addresses, contact information) from summaries to comply with GDPR. Focus on material planning considerations.

There are ${repLetters.length} representation letters and ${consultations.length} consultation responses.

Provide your analysis in the following JSON format:
{
  "address": "The site address from the application if identifiable from the document names, otherwise 'Address not available'",
  "stats": {
    "total": ${documents.length},
    "objections": <estimated number of objecting representations>,
    "support": <estimated number of supporting representations>,
    "neutral": <estimated number of neutral/technical responses>
  },
  "categorySummaries": [
    {
      "category": "Objection",
      "summary": "Based on the representation letters received, summarise the likely material planning concerns. Common themes for residential representations include impact on character, traffic, amenity, overlooking, etc. Be specific to the types of addresses and locations shown."
    },
    {
      "category": "Support",
      "summary": "If any representations appear supportive, summarise likely support themes."
    },
    {
      "category": "Neutral",
      "summary": "Summarise the consultation responses from statutory consultees and technical bodies."
    }
  ],
  "officerReport": [
    {
      "category": "Objection",
      "count": <number>,
      "grounds": ["Concise ground 1", "Concise ground 2"]
    },
    {
      "category": "Support",
      "count": <number>,
      "grounds": ["Concise ground 1"]
    },
    {
      "category": "Neutral",
      "count": <number>,
      "grounds": ["Concise ground 1"]
    }
  ],
  "keywords": [
    {"word": "keyword", "count": <estimated frequency>}
  ]
}

Rules:
- Consultation responses should be categorised as Neutral
- Representation letters from residential addresses are most commonly objections, but use your judgement
- For officerReport grounds, use concise bullet-point text suitable for planning officer reports
- For keywords, estimate 12-15 planning-related terms likely to appear based on the context
- Only include categories that have representations (if no support, omit Support)
- Stats must sum: objections + support + neutral = total (${documents.length})

Respond ONLY with the JSON object.`;

  console.log(`Sending ${documents.length} documents to AI for analysis...`);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : '';

  let parsed;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.error('Failed to parse AI response:', responseText);
    throw new Error('Failed to parse AI summarization response');
  }

  // Use AI-determined stats
  stats.objections = parsed.stats?.objections ?? 0;
  stats.support = parsed.stats?.support ?? 0;
  stats.neutral = parsed.stats?.neutral ?? 0;

  // Build sources
  const sources = [
    {
      url: `https://iawpa.horsham.gov.uk/PublicAccess_LIVE/SearchResult/RunThirdPartySearch?FileSystemId=DH&FOLDER1_REF=${encodeURIComponent(reference)}`,
      label: 'horsham.gov.uk',
    },
  ];

  return {
    reference,
    address: parsed.address || 'Address not available',
    stats,
    categorySummaries: parsed.categorySummaries || [],
    officerReport: parsed.officerReport || [],
    keywords: parsed.keywords || [],
    sources,
  };
}
