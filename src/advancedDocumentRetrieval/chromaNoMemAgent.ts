/**
 * Imports
 */

/* Imports from Langchain */
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RetrievalQAChain } from "langchain/chains";

/* Chroma Vector store imports */
import { Chroma } from "langchain/vectorstores/chroma";

/* Imports OpenAI Key */
import { config } from "dotenv";
config({});

/* Langchain agent tools */
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChainTool } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";

/**
 * Chroma vector store connection
 */

const vectorStore = await Chroma.fromExistingCollection(new OpenAIEmbeddings(), {
  collectionName: "a-test-collection",
  url: "http://localhost:8000", // Optional, will default to this value
  collectionMetadata: {
    "hnsw:space": "cosine",
  }, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
});

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
export const chainNoMemChromaDocRetrieval = RetrievalQAChain.fromLLM(
  model,
  vectorStore.asRetriever(),
  {
    returnSourceDocuments: false,
  }
);
/* Turning the chain into a tool */
const docRetrievalTool = new ChainTool({
  chain: chainNoMemChromaDocRetrieval,
  name: "document-retreival-qa",
  description:
    "Useful for when a user asks about STIT (Stitch it in time). ",
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
const input1 = "What is France's captial?";

const result1 = await executor.call({ input: input1 });
console.log(result1);