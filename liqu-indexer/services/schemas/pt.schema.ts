import { onchainTable } from "ponder";

export const mintAsset = onchainTable("mintAsset", (t) => ({
  id: t.text().primaryKey(),
  address: t.text(),
  tokenId: t.bigint(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionHash: t.text(),
  transactionIndex: t.bigint(),
  logIndex: t.bigint(),
}));

export const mintPrinciple = onchainTable("mintPrinciple", (t) => ({
  id: t.text().primaryKey(),
  sender: t.text(),
  tokenId: t.bigint(),
  deadline: t.bigint(),
  pool: t.text(),
  presaleAmount: t.bigint(),
  mintAmount: t.bigint(),
  transactionHash: t.text(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionIndex: t.bigint(),
  logIndex: t.bigint(),
}));

export const presaleBought = onchainTable("presaleBought", (t) => ({
  id: t.text().primaryKey(),
  amount: t.bigint(),
  sender: t.text(),
  transactionHash: t.text(),
  transactionIndex: t.bigint(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  logIndex: t.bigint(),
}));

export const deployGuard = onchainTable("deployGuard", (t) => ({
  id: t.text().primaryKey(),
  guard: t.text(),
  yield: t.text(),
  floorTick: t.bigint(),
  bal: t.bigint(),
  transactionHash: t.text(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  logIndex: t.bigint(),
}));

export const propertyRegistered = onchainTable("propertyRegistered", (t) => ({
  id: t.text().primaryKey(),
  owner: t.text(),
  tokenId: t.bigint(),
  metadataURI: t.text(),
  transactionHash: t.text(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionIndex: t.bigint(),
  logIndex: t.bigint(),
}));

export const yieldDistributed = onchainTable("yieldDistributed", (t) => ({
  id: t.text().primaryKey(),
  tokenId: t.bigint(),
  holderShare: t.bigint(),
  baselineShare: t.bigint(),
  platformShare: t.bigint(),
  distributedAt: t.bigint(),
  transactionHash: t.text(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionIndex: t.bigint(),
  logIndex: t.bigint(),
}));

export const reportAcknowledged = onchainTable("reportAcknowledged", (t) => ({
  id: t.text().primaryKey(),
  tokenId: t.bigint(),
  acknowledgedAt: t.bigint(),
  transactionHash: t.text(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionIndex: t.bigint(),
  logIndex: t.bigint(),
}));

export const platformFeeMinted = onchainTable("platformFeeMinted", (t) => ({
  id: t.text().primaryKey(),
  treasury: t.text(),
  tokenId: t.bigint(),
  amount: t.bigint(),
  transactionHash: t.text(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionIndex: t.bigint(),
  logIndex: t.bigint(),
}));

export const wrapped = onchainTable("wrapped", (t) => ({
  id: t.text().primaryKey(),
  tokenId: t.bigint(),
  user: t.text(),
  amount: t.bigint(),
  transactionHash: t.text(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionIndex: t.bigint(),
  logIndex: t.bigint(),
}));

export const unwrapped = onchainTable("unwrapped", (t) => ({
  id: t.text().primaryKey(),
  tokenId: t.bigint(),
  user: t.text(),
  amount: t.bigint(),
  transactionHash: t.text(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionIndex: t.bigint(),
  logIndex: t.bigint(),
}));
