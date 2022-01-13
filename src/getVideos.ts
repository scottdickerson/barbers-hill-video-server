import { Request, Response } from "express";
import fs from "fs";
import path from "path";

interface IVideoDetails {
  fileName: string;
  file: any; // TODO figure out the correct type for a video blob
}

const VIDEO_PATH = "videos";

export const streamVideo = (
  videoFileName: string,
  responseStream: Response
) => {
  try {
    const videoFilePath = path.join(__dirname, VIDEO_PATH, videoFileName);
    if (!fs.existsSync(videoFilePath)) {
      responseStream.status(404);
      responseStream.send("File does not exist");
    } else {
      const videoStream = fs.createReadStream(videoFilePath);
      videoStream.on("open", () => {
        // responseStream.set to be a file size
        videoStream.pipe(responseStream);
      });

      videoStream.on("error", () => {
        responseStream.send(`Error reading the file ${videoFileName}`);
      });
    }
  } catch (error) {
    console.error("error opening file", videoFileName, error);
    responseStream.send(error);
  }
};
