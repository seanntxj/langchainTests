import { config } from "dotenv";
config({});


import { TextLoader } from "langchain/document_loaders/fs/text";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { FaissStore } from "langchain/vectorstores/faiss";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";

// Set up DirectoryLoader to load documents from the ./documents directory
const loader = new DirectoryLoader("src/data", {
  ".txt": (path) => new TextLoader(path),
  ".pdf": (path) => new PDFLoader(path),
});

const docs = await loader.load();

const splitter = new CharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 100,
});

const documents = await splitter.splitDocuments(docs);
console.log(documents);

const embeddings = new OpenAIEmbeddings();

// Store into local directory
const vectorstore = await FaissStore.fromDocuments(documents, embeddings);
await vectorstore.save("src/vectors");