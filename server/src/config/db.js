import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__db) {
    global.__db = new PrismaClient({
      log: ['error', 'warn']
    });
  }
  prisma = global.__db;
}

// Enhance $transaction to support standalone MongoDB instances without replica sets
const originalTransaction = prisma.$transaction.bind(prisma);
prisma.$transaction = async function (arg, options) {
  if (typeof arg === 'function') {
    try {
      return await originalTransaction(arg, options);
    } catch (err) {
      const errMsg = err?.message || '';
      if (
        errMsg.includes('replica set') ||
        errMsg.includes('Transaction numbers') ||
        errMsg.includes('transactions are not supported')
      ) {
        // Fallback: execute callback with prisma client for standalone MongoDB instances
        return await arg(prisma);
      }
      throw err;
    }
  }
  return await originalTransaction(arg, options);
};

export default prisma;
