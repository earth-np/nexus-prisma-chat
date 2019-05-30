import * as path from "path";
import { GraphQLServer } from "graphql-yoga";
import { makePrismaSchema, prismaObjectType } from "nexus-prisma";
import { prisma } from "./src/generated/prisma-client";
import datamodelInfo from "./src/generated/nexus-prisma";
import { stringArg, idArg, subscriptionField } from "nexus/dist";
import { SubscriptionClient } from "subscriptions-transport-ws";

const Query = prismaObjectType({
  name: "Query",
  definition: t => {
    t.prismaFields(["*"]);
    t.list.field("messagesInRoom", {
      type: "Message",
      args: {
        roomId: idArg()
      },
      resolve: (parent, { roomId }, ctx) => {
        return ctx.prisma.messages({
          where: { inRoom: { id: roomId } },
          orderBy: "createdAt_DESC"
        });
      }
    });
    // t.field("findMessage",{
    //   type: "Message",
    //   args: {
    //     messageId: idArg(),
    //   },
    //   resolve: (parent,{messageId},ctx) =>{
    //         console.log('roomID',messageId );
    //         return ctx.prisma.message({id:messageId})
    //       }

    // })
  }
});
const Mutation = prismaObjectType({
  name: "Mutation",
  definition: t => {
    t.prismaFields(["*"]);
    t.field("sentMessage", {
      type: "Message",
      args: {
        text: stringArg(),
        userId: idArg(),
        roomId: idArg()
      },
      resolve: (parent, { text, userId, roomId }, ctx) => {
        return ctx.prisma.createMessage({
          text,
          sentBy: {
            connect: { id: userId }
          },
          inRoom: {
            connect: { id: roomId }
          }
        });
      }
    });
    
  }
});

const Subscription = subscriptionField('newMessage',{
  type: "Message",
  args: {
    roomId: idArg()
  },
  subscribe(root,{roomId},ctx) {
    return ctx.prisma.$subscribe.message({mutation_in: "CREATED",node:{inRoom:{id:roomId}}}).node()
  },
  resolve(payload) {
    return payload
  }
})

const Message = prismaObjectType({
  name: "Message",
  definition: t => {
    t.prismaFields(["*"]);
  }
});
const Room = prismaObjectType({
  name: "Room",
  definition: t => {
    t.prismaFields(["*"]);
  }
});

const schema = makePrismaSchema({
  types: [Query, Mutation, Message, Room,Subscription],

  prisma: {
    datamodelInfo,
    client: prisma
  },

  outputs: {
    schema: path.join(__dirname, "./generated/schema.graphql"),
    typegen: path.join(__dirname, "./generated/nexus.ts")
  }
});

const server = new GraphQLServer({
  schema,
  context: { prisma }
});
server.start(() => console.log(`Server is running on http://localhost:4000`));
