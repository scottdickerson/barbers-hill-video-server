import { Stream } from "stream";
import { streamVideo } from "./getVideos";
import { getMockRes } from "@jest-mock/express";
describe("getVideos", () => {
  // it("listVideos", () => {
  //   const videos = listVideos();
  //   expect(videos).toHaveLength(2);
  // });
  // it("streamVideo", (done) => {
  //   const responseStream = new Stream.Writable();
  //   responseStream._write = (chunk, encoding, next) => {
  //     console.log("got chunk", chunk.toString());
  //     next();
  //   };
  //   responseStream.on("close", () => {
  //     done();
  //   });
  //   streamVideo("video1.mp4", responseStream);
  // });
  // it("streamVideo", (done) => {
  //   const { res: responseStream } = getMockRes({
  //     _write: (chunk, encoding, next) => {
  //       console.log("got chunk", chunk.toString());
  //       next();
  //       done();
  //     },
  //   });
  //   streamVideo("video1.mp4", responseStream);
  // });
});
