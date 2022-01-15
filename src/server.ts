import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import formidable from "formidable";
import { omit } from "lodash";
import mongoDB, { MongoClient } from "mongodb";
import path from "path";
import IVideo from "./types";

import { deleteVideo, streamVideo } from "./getVideos";

// Replace the uri string with your MongoDB deployment's connection string.
const uri = `mongodb+srv://${process.env.MONGO_USER}:${
  process.env.MONGO_PASS
}@${process.env.MONGO_HOSTNAME || "127.0.0.1"}${
  process.env.MONGO_PORT ? ":" + process.env.MONGO_PORT || "27017" : ""
}/?retryWrites=true&w=majority`;

console.log("mongo db url", uri);
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
  keepExtensions: false,
  uploadDir: path.join(__dirname, "..", "dist", "videos"),
});

app.use(cors());

// This is used by the video source tag in our HTML to stream the actual video
app.get("/api/:videoName", (req: Request, res: Response) => {
  const videoToStream = req.params.videoName;
  streamVideo(videoToStream, res);
});

app.get(
  "/api/videoMetadata/:videoName",
  async (req: Request, res: Response) => {
    const videoToEdit = req.params.videoName;
    const videoDetails = (await videoDatabaseConnection.findOne({
      videoFilename: videoToEdit,
    })) as IVideo;
    res.send(videoDetails);
  }
);

app.get("/api", async (req: Request, res: Response) => {
  const videosDetails = (await videoDatabaseConnection
    .find()
    .toArray()) as IVideo[];
  // order by sequence number ascending

  videosDetails.sort(
    ({ sequence: sequence1 }, { sequence: sequence2 }) => sequence1 - sequence2
  );
  console.log("sorted video titles from database: ", videosDetails);
  videosDetails.forEach((video) => console.log(video.title));
  res.json(videosDetails);
});

app.delete("/api", (req, res) => {
  res.send("deleted all videos");
  videoDatabaseConnection.drop();
});

app.delete("/api/:videoName", async (req: Request, res: Response) => {
  const videoName = req.params.videoName;
  const deletedInfo = await videoDatabaseConnection.deleteOne({
    videoFilename: req.params.videoName,
  });
  if (deletedInfo.deletedCount > 0) {
    console.log("deleted video title from database: ", videoName);
    deleteVideo(videoName);
    res.send("Deleted video");
  } else {
    console.log("could not find video to delete", videoName);
    res.sendStatus(404);
  }
});

const parseForm = (req: Request, res: Response, next: NextFunction) => {
  form.parse(req, async (err, fields, files) => {
    if (err) {
      next(err);
    }

    const isUpdate = req.params?.videoName;
    console.log("Is this an update? ", isUpdate);
    const videoFilename =
      req.params?.videoName || // passed as a param if editing, first check the edit case, otherwise it's a new file
      (files.videoFile as formidable.File)?.newFilename; // I'm sure this is only one file at a time

    const newVideo = {
      ...fields,
      sequence: parseInt(fields.sequence as string, 10),
      videoFilename,
    };
    console.log("uploading new video", JSON.stringify(newVideo));
    try {
      await videoDatabaseConnection.replaceOne(
        { videoFilename }, // either use the new name or the old one
        { ...omit(newVideo, ["_id"]), videoFilename }, // cannot mess with the existing id
        {
          upsert: true,
        }
      );
    } catch (error) {
      console.error(error);
      console.log("could not insert/update new video", newVideo);
      res.sendStatus(500);
    }
    // now redirect back to the list/add page since we've added the file
    console.log("Redirecting to main page");
    res.setHeader(
      "location",
      isUpdate ? "/ui/listVideos.html" : "/ui/mainNavigation.html"
    );
    res.sendStatus(301);
  });
};

app.post("/api", (req: Request, res: Response, next: NextFunction) => {
  console.log("creating video");
  parseForm(req, res, next);
});

// Bad API design due to form limitation
app.post("/api/:videoName", (req, res, next) => {
  console.log("updating video ", req.params.videoName);
  parseForm(req, res, next);
});

app.put(
  "/api/reorder/:videoName/:direction",
  async (req: Request, res: Response) => {
    const direction = req.params.direction;
    const upOrDownDelta = direction === "up" ? -1 : 1;
    const videoName = req.params.videoName;

    const videoToMove = (await videoDatabaseConnection.findOne({
      videoFilename: videoName,
    })) as IVideo;

    const newSequence = videoToMove?.sequence + upOrDownDelta;

    // TODO: this assumes that the sequences are always correct in the db and there are no duplicates!
    // increment or decrement the previous or subsequenct video
    try {
      await videoDatabaseConnection.updateOne(
        {
          sequence: newSequence,
        },
        { $set: { sequence: videoToMove?.sequence } }
      );

      // then update bump up the current video
      await videoDatabaseConnection.updateOne(
        { videoFilename: videoName },
        {
          $set: {
            sequence: newSequence,
          },
        }
      );
    } catch (error) {
      console.error(error);
      console.log("could not update video", videoName);
      res.sendStatus(500);
    }
    console.log(`Moved videoName ${videoName} ${upOrDownDelta}`);
    res.send(`Moved videoName ${videoName} ${upOrDownDelta}`);
  }
);

// serve anything from UI directly
app.use("/ui", (...args) => {
  return express.static("dist/ui")(...args);
});

// default page
app.use("/", (req, res) => {
  console.log("hit index");
  res.setHeader("location", "/ui/mainNavigation.html");
  res.sendStatus(301);
});

console.log("Video server listening on port", port);
app.listen(port);
