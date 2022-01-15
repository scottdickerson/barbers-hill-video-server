import { ObjectId, WithId } from "mongodb";

export default interface IVideo extends WithId<Document> {
  title: string;
  description: string;
  keywords: string;
  sequence: number;
  videoFilename: string;
  id: ObjectId;
}
