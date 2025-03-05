import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ObjectId } from "mongoose";
import { MessageSeen } from "src/message/message.schema";

@Injectable()
export class MessageService{

    constructor(
         @InjectModel(MessageSeen.name)
            private readonly seenModel:Model<MessageSeen>
    ){}

    async markAsSeen(
      {  messageId,
        userId,
        name,
        image}:{messageId:ObjectId,
            userId: ObjectId,
            name: string,
            image: string,}
      ) {
        return await this.seenModel.updateOne(
          { messageId, userId }, // Ensure uniqueness per message-user
          { $setOnInsert: { name, image, seenAt: new Date() } },
          { upsert: true }, // Insert if not exists, do nothing if already seen
        );
      }
}