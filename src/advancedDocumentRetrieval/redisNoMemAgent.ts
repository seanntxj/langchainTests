/**
 * Imports
 */

/* Imports from Langchain */
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RetrievalQAChain } from "langchain/chains";

/* Redis Vector store imports */
import { createClient } from "redis";
import { RedisVectorStore } from "langchain/vectorstores/redis";

/* Imports OpenAI Key */
import { config } from "dotenv";
config({});

/* Langchain agent tools */
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChainTool } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";

/**
 * Redis vector store connection
 */

const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});
await client.connect();
const vectorStore = new RedisVectorStore(
  new OpenAIEmbeddings({
    // openAIApiKey: "canbepassedhere",
  }),
  {
    redisClient: client,
    indexName: "testDocsForClient01",
  }
);

/**
 * Creating an OpenAI model instance
 */

/* Usage as part of a chain */
export const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.5,
  // openAIApiKey: "ANDcanbepassedhere",
});

/**
 * Creating the chain for document retrieval
 */
/* Creating the doc retrieval chain */
export const chainNoMemRedisDocRetrieval = RetrievalQAChain.fromLLM(
  model,
  vectorStore.asRetriever(),
  {
    returnSourceDocuments: false,
  }
);
/* Turning the chain into a tool */
const docRetrievalTool = new ChainTool({
  chain: chainNoMemRedisDocRetrieval,
  name: "document-retreival-qa",
  description:
    "Useful for when a user asks about RealFake or STIT (Stitch it in time). ",
});


/**
 * Creating the agent and giving it its tools
 */

const tools = [new Calculator(), docRetrievalTool];
const executor = await initializeAgentExecutorWithOptions(tools, model, {
  agentType: "chat-conversational-react-description",
  verbose: true, // Show the thought process of the bot
  maxIterations: 10, // Stop the Agent from going on an infinte loop
});

/**
 * Trying out a question 
 */
const input1 = "What's the objective of RealFake?";

const result1 = await executor.call({ input: input1 });
console.log(result1);

/**
 * Ensure to disconnect from the Redis session before closing the script
 */

await client.disconnect();