/**
 * Imports
 */

/* Imports from Langchain */
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CharacterTextSplitter } from "langchain/text_splitter";

/* Redis Vector store imports */
import { createClient } from "redis";
import { RedisVectorStore } from "langchain/vectorstores/redis";

/* Imports OpenAI Key */
import { config } from "dotenv";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { Document } from "langchain/document";
import { DocumentLoader } from "langchain/document_loaders/base";
config({});

/**
 * Redis vector store connection
 */

const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});
await client.connect();

const links = ["put valid links here"];

/**
 * Injesting client docs & vectorising it into Redis
 */

/* Create Document object containing all the client docs */
const createLoader = (file: Blob): DocumentLoader => {
  if (file.type.includes("document") || file.type.includes("office")) {
    return new DocxLoader(file);
  } else if (file.type.includes("pdf")) {
    return new PDFLoader(file);
  } else if (file.type.includes("plain")) {
    return new TextLoader(file);
  } else if (file.type.includes("csv")) {
    return new CSVLoader(file);
  } else {
    return new TextLoader(file);
  }
};

const docs: Document<Record<string, any>>[] = [];
for (const link of links) {
  const file = await fetch(link).then((res) => res.blob());
  const loader = createLoader(file);

  const oneDocs = await loader.load();
  docs.push(...oneDocs);
}

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
