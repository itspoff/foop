// from https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/

import { MongoClient } from "mongodb";
import { config } from "dotenv";

config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let dbInstance;

async function connectToDatabase() {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(process.env.MONGO_DB || "uma_cluster_1");
    console.log("Connected to MongoDB");
  }
  return dbInstance;
}

export default connectToDatabase;
