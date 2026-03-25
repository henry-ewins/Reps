import Anthropic from '@anthropic-ai/sdk';
import type { DocumentInfo } from '../src/types/index.js';
import type { ProcessingResult } from '../src/types/index.js';

const anthropic = new Anthropic();

export async function summarizeRepresentations(
  reference: string,
  documents: DocumentInfo[]
): Promise<ProcessingResult> {
  const documentTexts = documents
    .map(
      (doc, i) =>
        `--- Document ${i + 1} ---\nType: ${doc.type}\nDate: ${doc.date}\nTitle: ${doc.title}\nContent:\n${doc.text || '[No content available]'}\n`
    )
    .join('\n');

  const prompt = `You are an expert UK planning officer assistant. Analyze the following representation letters and consultation responses for planning application ${reference}.

IMPORTANT: Filter out personal data (names, addresses, contact information, email addresses, phone numbers) from your analysis to comply with GDPR/data protection regulations. Focus only on the planning-related content and arguments.

Documents:
${documentTexts}

Provide your analysis in the following JSON format exactly:
{
  "address": "The site address from the documents if identifiable, otherwise 'Address not available'",
  "stats": {
    "total": <number of distinct representations>,
    "objections": <number objecting>,
    "support": <number supporting>,
    "neutral": <number neutral/commenting>
  },
  "categorySummaries": [
    {
      "category": "Objection",
      "summary": "A comprehensive paragraph summarizing all objection themes and arguments. Focus on material planning considerations."
    },
    {
      "category": "Support",
      "summary": "A comprehensive paragraph summarizing all support themes and arguments."
    },
    {
      "category": "Neutral",
      "summary": "A comprehensive paragraph summarizing neutral comments and technical observations."
    }
  ],
  "officerReport": [
    {
      "category": "Objection",
      "count": <number>,
      "grounds": ["Ground 1", "Ground 2", "..."]
    },
    {
      "category": "Support",
      "count": <number>,
      "grounds": ["Ground 1", "Ground 2", "..."]
    },
    {
      "category": "Neutral",
      "count": <number>,
      "grounds": ["Ground 1", "Ground 2", "..."]
    }
  ],
  "keywords": [
    {"word": "keyword1", "count": <frequency>},
    {"word": "keyword2", "count": <frequency>}
  ]
}

For the keywords, extract the 15 most frequently used meaningful words from the representation letters (excluding common words like "the", "and", "is", etc.). Focus on planning-related terms.

For the officerReport grounds, use concise bullet-point style text suitable for inclusion in an officer's planning report (e.g., "Unsustainable location outside built-up area boundary", "Increased traffic on narrow rural lanes").

Only include categories that have representations. If there are no objections, don't include an Objection category, etc.

Respond ONLY with the JSON object, no other text.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse the JSON response
  let parsed;
  try {
    // Try to extract JSON from the response (handle potential markdown wrapping)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.error('Failed to parse AI response:', responseText);
    throw new Error('Failed to parse AI summarization response');
  }

  // Build sources from document URLs
  const sources: { url: string; label: string }[] = [];
  const seenDomains = new Set<string>();
  for (const doc of documents) {
    if (doc.url) {
      try {
        const domain = new URL(doc.url).hostname;
        if (!seenDomains.has(domain)) {
          seenDomains.add(domain);
          sources.push({ url: doc.url, label: domain });
        }
      } catch {
        // skip invalid URLs
      }
    }
  }

  // Always include the council portal
  if (!seenDomains.has('iawpa.horsham.gov.uk')) {
    sources.push({
      url: `https://iawpa.horsham.gov.uk/PublicAccess_LIVE/SearchResult/RunThirdPartySearch?FileSystemId=DH&FOLDER1_REF=${encodeURIComponent(reference)}`,
      label: 'horsham.gov.uk',
    });
  }

  return {
    reference,
    address: parsed.address || 'Address not available',
    stats: parsed.stats,
    categorySummaries: parsed.categorySummaries || [],
    officerReport: parsed.officerReport || [],
    keywords: parsed.keywords || [],
    sources,
  };
}
