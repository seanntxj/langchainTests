
/**
 * Imports
 */

/* Imports from Langchain */
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CharacterTextSplitter } from "langchain/text_splitter";

/* Redis Vector store imports */ 
import { createClient } from "redis";
import { RedisVectorStore } from "langchain/vectorstores/redis";

/* Imports OpenAI Key */
import { config } from "dotenv";
config({});

/**
 * Redis vector store connection
 */

const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});
await client.connect();

/**
 * Injesting client docs & vectorising it into Redis
 */

/* Create Document object containing all the client docs */
const loader = new DirectoryLoader("src/data", {
  ".txt": (path) => new TextLoader(path),
  ".pdf": (path) => new PDFLoader(path),
});
const docs = await loader.load();

/* Split the Document into chunks */
const splitter = new CharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 100,
});
const documents = await splitter.splitDocuments(docs);

/* Save the vectorised docs into Redis */
const vectorStore = await RedisVectorStore.fromDocuments(
  documents,
  new OpenAIEmbeddings(),
  {
    redisClient: client,
    indexName: "testDocsForClient01",
  }
);

/**
 * Ensure to disconnect from the Redis session before closing the script
 */

await client.disconnect();