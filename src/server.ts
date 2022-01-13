import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import formidable from "formidable";
import mongoDB, { MongoClient } from "mongodb";
import path from "path";
import { streamVideo } from "./getVideos";

// Replace the uri string with your MongoDB deployment's connection string.
const uri = `mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000`;
const client = new MongoClient(uri);
let videoDatabaseConnection: mongoDB.Collection;

async function connectToDB() {
  await client.connect();
  const database = client.db("barbers-hill");
  videoDatabaseConnection = database.collection("videos");
}

connectToDB().catch(console.dir);

const app = express();
const port = process.env.PORT || 3000;
const form = formidable({
  filename: (name, ext, { originalFilename }) => originalFilename || name,
  keepExtensions: true,
  uploadDir: path.join(__dirname, "..", "dist", "videos"),
});

app.use(cors());

// This is used by the video source tag to stream the actual video

app.get("/:videoName", (req: Request, res: Response) => {
  const videoToStream = req.params.videoName;
  streamVideo(videoToStream, res);
});

app.get("/", async (req: Request, res: Response) => {
  const videosDetails = await videoDatabaseConnection.find().toArray();
  console.log("video titles from database: ");
  videosDetails.forEach((video) => console.log(video.title));
  res.json(videosDetails);
});

app.delete("/", (req, res) => {
  res.send("deleted Videos");
  videoDatabaseConnection.drop();
});

app.post("/", (req: Request, res: Response, next: NextFunction) => {
  form.parse(req, (err, fields, files) => {
    if (err) {
      next(err);
    }
    const videoFilename = (files.videoFile as formidable.File).newFilename; // I'm sure this is only one file at a time
    console.log(JSON.stringify(fields));
    console.log("video videoFilename being uploaded: ", videoFilename);
    videoDatabaseConnection.insertOne({ ...fields, videoFilename });
    // now redirect back to the list/add page since we've added the file
    console.log("Redirecting to main page");
    res.setHeader("location", "/ui/returnPage.html");
    res.sendStatus(301);
  });
});

// serve anything from UI directly
app.use("/ui", (...args) => {
  console.log("hit ui route");
  return express.static("dist/ui")(...args);
});

console.log("Video server listening on port", port);
app.listen(port);
