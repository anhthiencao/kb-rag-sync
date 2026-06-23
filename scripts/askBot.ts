#!/usr/bin/env node
/**
 * Ask OptiBot a question from the CLI and print the grounded answer + citations.
 *
 * Uses the **Responses API** with the file_search tool over the same Vector Store
 * (the non-deprecated path; the Assistant in the Playground uses the same store).
 * Doubles as a programmatic check that retrieval + citations work end-to-end.
 *
 *   npm run ask "How do I add a YouTube video?"
 */
import { loadConfig } from '../src/config.js';
import { getClient } from '../src/store/openaiUploader.js';

const SYSTEM_PROMPT = `You are OptiBot, the customer-support bot for OptiSigns.com.
• Tone: helpful, factual, concise.
• Only answer using the uploaded docs.
• Max 5 bullet points; else link to the doc.
• Cite up to 3 "Article URL:" lines per reply.`;

async function main(): Promise<number> {
  const question = process.argv.slice(2).join(' ') || 'How do I add a YouTube video?';
  const cfg = loadConfig();
  if (!cfg.openaiApiKey || !cfg.vectorStoreId) {
    console.error('OPENAI_API_KEY and VECTOR_STORE_ID are required');
    return 1;
  }
  const client = getClient(cfg.openaiApiKey);

  const resp = await (client as any).responses.create({
    model: 'gpt-4o',
    instructions: SYSTEM_PROMPT,
    input: question,
    tools: [{ type: 'file_search', vector_store_ids: [cfg.vectorStoreId] }],
  });

  console.log(`\nQ: ${question}\n`);
  console.log(resp.output_text ?? '(no text)');

  // Collect file citations from annotations.
  const cited = new Set<string>();
  for (const item of resp.output ?? []) {
    for (const c of item.content ?? []) {
      for (const ann of c.annotations ?? []) {
        if (ann.filename) cited.add(ann.filename);
      }
    }
  }
  if (cited.size) console.log(`\nCited files: ${[...cited].join(', ')}`);
  return 0;
}

main().then((code) => process.exit(code));
