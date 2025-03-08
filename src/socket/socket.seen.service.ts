import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Socket } from 'socket.io';
import { Message,  } from 'src/message/message.schema';
import { MessageSeen } from 'src/message/schema/seen.schema';
import { ObjectId as mongoId } from 'mongodb';
import { Reaction } from 'src/message/schema/reaction.schema';
// import { MessageSeen } from 'src/message/message.schema';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(MessageSeen.name)
    private readonly seenModel: Model<MessageSeen>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    @InjectModel(Reaction.name)
    private readonly reactionModel: Model<Reaction>,
  ) {}

  async markAsSeen({
    messageId,
    userId,
    name,
    image,
  }: {
    messageId: ObjectId;
    userId: ObjectId;
    name: string;
    image: string;
  }):Promise<{alreadySeen:boolean}> {
    let seen = await this.seenModel.findOne({ messageId ,userId});
    if(seen){
      return {alreadySeen:true}
    }
      seen = new this.seenModel({ messageId, userId, name, image });
     await seen.save();
    return {alreadySeen:false}
  }

  async handleReaction(
    payload: { id: string; name: string; profilePicture: string },
    data: { messageId: string; reactionType: string },
    socket: Socket,
  ): Promise<void> {
    try {
      let messageId = new mongoId(data.messageId) as unknown as ObjectId;
      let userId = new mongoId(payload.id.toString()) as unknown as ObjectId;

      // Fetch the message
      let message = await this.messageModel.findById(messageId);
      if (!message) throw new Error('Message not found');

      // ✅ Convert reactions to a Map if it's not already
      if (!message.reactions || !(message.reactions instanceof Map)) {
        message.reactions = new Map(
          Object.entries({
            haha: 0,
            cancel: 0,
            like: 0,
            love: 0,
            angry: 0,
            ok: 0,
          }),
        );
      }
      // Fetch the user's existing reaction
      let existingReaction: Reaction | null = await this.reactionModel.findOne({
        messageId,
        userId,
      });
      const reactionType = String(data.reactionType); // Ensure it's a string

      if (existingReaction) {
        if (existingReaction.value === reactionType) {
          
          // ❌ If the user already reacted with the same type, remove the reaction
          const currentCount = message.reactions.get(reactionType) || 0;
          message.reactions.set(reactionType, Math.max(currentCount - 1, 0)); // Prevent negative values
          console.log("Existing Reaction",message)
          await this.reactionModel.deleteOne({ _id: existingReaction._id });
        } else {
          // 🔄 If the user changes the reaction, remove the old one and add the new one
          if (existingReaction.value) {
            const oldCount = message.reactions.get(existingReaction.value) || 0;
            message.reactions.set(
              existingReaction.value,
              Math.max(oldCount - 1, 0),
            ); // Prevent negative values
          }
          const newCount = message.reactions.get(reactionType) || 0;
          message.reactions.set(reactionType, newCount + 1);
          existingReaction.value = reactionType;
          await existingReaction.save();
        }
      } else {
        // ➕ New reaction
        const newCount = message.reactions.get(reactionType) || 0;
        message.reactions.set(reactionType, newCount + 1);
        const reaction = new this.reactionModel({
          messageId,
          userId,
          value: reactionType,
        });
        console.log(reaction)
        await Promise.all([reaction.save(), message.save()]);
      }
      message.reactions.forEach((value, key) => {
        if (typeof value !== 'number') {
          console.warn(
            `Invalid value in reactions for key: ${key}, resetting to 0`,
          );
          message.reactions.set(key, 0);
        }
      });
      message.reactions = new Map(
        Object.entries(Object.fromEntries(message.reactions)),
      );
      console.log(message.reactions)
      await message.save();

      let room = message.groupId
        ? message.groupId.toString()
        : message.conversationId.toString();

      socket.to(room).emit('messageReactionUpdated', {
        messageId: data.messageId,
        reactions: Object.fromEntries(message.reactions), // Convert Map to JSON
      });

      socket.emit('messageReactionUpdated', {
        messageId: data.messageId,
        reactions: Object.fromEntries(message.reactions), // Convert Map to JSON
      });
    } catch (error) {
      console.error('Error handling message reaction:', error.message);
      socket.emit('error', { message: 'Failed to react to message.' });
    }
  }
  
}
