import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { omit } from "lodash";
import mongoDB, { GridFSBucket, MongoClient } from "mongodb";
import IVideo from "./types";
import multer from "multer";
const { GridFsStorage } = require("multer-gridfs-storage");

// Replace the uri string with your MongoDB deployment's connection string.
const uri = process.env.MONGO_HOSTNAME
  ? `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOSTNAME}/`
  : `mongodb://127.0.0.1:${
      process.env.MONGO_PORT ? process.env.MONGO_PORT : "27017"
    }/`;

const VIDEO_BUCKET_NAME = "videos";

const databaseName = process.env.TEST_DB || "barbers-hill";

var storage = new GridFsStorage({
  url: uri + databaseName,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req: Request, file: { originalname: string }) => {
    return {
      bucketName: VIDEO_BUCKET_NAME,
      filename: file.originalname,
    };
  },
});

export const uploadFiles = multer({ storage: storage }).single("videoFile");

console.log("mongo db url", uri);
const client = new MongoClient(uri);
let videoDatabaseConnection: mongoDB.Collection;
let overviewConnection: mongoDB.Collection;
let videosBucket: mongoDB.GridFSBucket;
let videosDatabaseCollection: mongoDB.Collection;

async function connectToDB() {
  await client.connect();
  const database = client.db(databaseName);
  videoDatabaseConnection = database.collection("videos");
  overviewConnection = database.collection("overview");
  videosBucket = new GridFSBucket(database, { bucketName: VIDEO_BUCKET_NAME });
  videosDatabaseCollection = database.collection(`${VIDEO_BUCKET_NAME}.files`);

  console.log(
    `connected to the barbers hill mongo database here: ${
      process.env.MONGO_HOSTNAME || "mongodb://127.0.0.1:27017"
    }`
  );
}

connectToDB().catch(console.dir);

const app = express();

const MAX_FILE_SIZE_MB = 300;

app.use(express.json());
const port = process.env.PORT || 3000;

app.use(cors());

app.get("/api/overview", async (req: Request, res: Response) => {
  const overview = await overviewConnection.findOne();
  res.json(overview);
});

app.put("/api/overview", (req: Request, res: Response) => {
  console.log("Updating overview: ", req.body);
  overviewConnection.replaceOne({}, req.body, {
    upsert: true,
  });
  res.json(req.body);
});

// This is used by the video source tag in our HTML to stream the actual video
app.get("/api/:videoName", (req: Request, res: Response) => {
  const fileName = req.params.videoName;
  console.log("downloading filename", fileName, typeof fileName);
  if (fileName && fileName !== "null") {
    try {
      console.log("trying to open download stream for file", fileName);
      const readableImage = videosBucket.openDownloadStreamByName(fileName);
      console.log("found file stream for video");
      // write the file
      readableImage.pipe(res);
    } catch (error) {
      console.error(error);
      console.log("error returning image", fileName);
    }
  } else {
    console.error("Cannot find filename", fileName);
  }
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
    // find the id of the image to delete from GridFS
    const videoToDelete = await videosDatabaseCollection.findOne({
      filename: videoName,
    });
    console.log("image to delete", videoToDelete);
    if (videoToDelete) {
      await videosBucket.delete(videoToDelete._id);
    }
    res.send("Deleted video");
  } else {
    console.log("could not find video to delete", videoName);
    res.sendStatus(404);
  }
});

const parseForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isUpdate = Boolean(req.params?.videoName);
    console.log("Is this an update? ", isUpdate);
    const fields = req.body;
    const videoFilename = req.file?.filename;
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
  } catch (error) {
    console.log("error parsing the form or uploading the image file");
    console.error(error);
  }
};

app.post(
  "/api",
  uploadFiles,
  (req: Request, res: Response, next: NextFunction) => {
    console.log("creating video");
    parseForm(req, res, next);
  }
);

// Bad API design due to form limitation
app.post("/api/:videoName", (req, res, next) => {
  console.log("updating video ", req.params.videoName);
  parseForm(req, res, next);
});

app.put(
  "/api/reorder/:videoName/:direction",
  async (req: Request, res: Response) => {
    console.log("reordering videos");
    const direction = req.params.direction;
    const upOrDownDelta = direction === "up" ? -1 : 1;
    const videoName = req.params.videoName;

    const videoToMove = (await videoDatabaseConnection.findOne({
      videoFilename: videoName,
    })) as IVideo;

    const newSequence = videoToMove?.sequence + upOrDownDelta;
    console.log("newSequence is", newSequence);
    console.log("oldSequence is", videoToMove?.sequence);

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
