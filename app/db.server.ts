import {PrismaClient} from "@prisma/client";

let prisma: PrismaClient; // NOSONAR

declare global {
    var __db__: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient();
} else {
    globalThis.__db__ ??= new PrismaClient();
    prisma = globalThis.__db__;
}

export {prisma};