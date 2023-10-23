
/**
 * Imports
 */

/* Imports from Langchain */
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CharacterTextSplitter } from "langchain/text_splitter";

/* Mongo Vector store imports */ 
import { MongoClient } from "mongodb";

/* Imports OpenAI Key */
import { config } from "dotenv";
import { MongoDBAtlasVectorSearch } from "langchain/vectorstores/mongodb_atlas";
config({});

/**
 * Mongo vector store connection
 */
const MONGODB_ATLAS_URI = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTERNAME}.z5ynmjb.mongodb.net/?retryWrites=true&w=majority`
console.log(MONGODB_ATLAS_URI)
const client = new MongoClient(MONGODB_ATLAS_URI);
const gptCollection = client.db('gptTest').collection('gptTest');

/**
 * Injesting client docs & vectorising it into Mongo
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

/* Save the vectorised docs into Mongo */
const vectorStore = await MongoDBAtlasVectorSearch.fromDocuments(
  documents,
  new OpenAIEmbeddings(),
  {
    collection: gptCollection,
    indexName: "default", // The name of the Atlas search index. Defaults to "default"
    textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
    embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
  }
);

/**
 * Ensure to disconnect from the Mongo session before closing the script
 */

await client.close();