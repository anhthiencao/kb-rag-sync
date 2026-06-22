#!/usr/bin/env node
/**
 * Create the OptiBot Assistant via API (run once).
 *
 * Prints the Assistant id and Vector Store id to put in .env.
 *
 * NOTE: The Assistants API is deprecated (removal ~August 2026). It is used here to
 * match the take-home brief. The recommended replacement is the Responses API
 * (client.responses.create with the file_search tool) against the same Vector Store
 * -- see README "Assistants API vs Responses API".
 */
import { loadConfig } from '../src/config.js';
import { VectorStoreUploader, getClient } from '../src/store/openaiUploader.js';

const SYSTEM_PROMPT = `You are OptiBot, the customer-support bot for OptiSigns.com.
• Tone: helpful, factual, concise.
• Only answer using the uploaded docs.
• Max 5 bullet points; else link to the doc.
• Cite up to 3 "Article URL:" lines per reply.`;

async function main(): Promise<number> {
  const cfg = loadConfig();
  if (!cfg.openaiApiKey) {
    console.error('OPENAI_API_KEY is required');
    return 1;
  }
  const client = getClient(cfg.openaiApiKey);
  const [, vsid] = await VectorStoreUploader.ensureStore(client, cfg.vectorStoreId, {
    name: 'OptiBot Docs',
  });

  const assistant = await (client as any).beta.assistants.create({
    name: 'OptiBot',
    model: 'gpt-4o',
    instructions: SYSTEM_PROMPT,
    tools: [{ type: 'file_search' }],
    tool_resources: { file_search: { vector_store_ids: [vsid] } },
  });

  console.log('Add these to your .env:');
  console.log(`VECTOR_STORE_ID=${vsid}`);
  console.log(`ASSISTANT_ID=${assistant.id}`);
  return 0;
}

main().then((code) => process.exit(code));
