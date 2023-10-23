
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
import { Chroma } from "langchain/vectorstores/chroma";

/* Imports OpenAI Key */
import { config } from "dotenv";
config({});

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
const vectorStore = await Chroma.fromDocuments(docs, new OpenAIEmbeddings(), {
  collectionName: "a-test-collection",
  url: "http://localhost:8000", // Optional, will default to this value
  collectionMetadata: {
    "hnsw:space": "cosine",
  }, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
});

/* Search for the most similar document */
const response = await vectorStore.similaritySearch("STIT", 1);

console.log(response);