import { ponder } from "ponder:registry";
import {
  deployGuard,
  mintAsset,
  mintPrinciple,
  presaleBought,
  platformFeeMinted,
  propertyRegistered,
  reportAcknowledged,
  yieldDistributed,
  wrapped,
  unwrapped,
} from "ponder:schema";

ponder.on("PrincipleToken:PrincipleAssetMinted", async ({ event, context }) => {
  const { db } = context;
  await db
    .insert(mintAsset)
    .values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      address: event.args.to,
      tokenId: event.args.tokenId,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      transactionIndex: BigInt(event.transaction.transactionIndex),
      logIndex: BigInt(event.log.logIndex),
    })
    .onConflictDoNothing();
});

ponder.on("PrincipleToken:PostionRegistered", async ({ event, context }) => {
  const { db } = context;
  await db
    .insert(mintPrinciple)
    .values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      sender: event.args.sender,
      tokenId: event.args.tokenId,
      deadline: event.args.deadline,
      pool: event.args.pool,
      presaleAmount: event.args.presaleAmount,
      mintAmount: event.args.mintAmount,
      transactionHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionIndex: BigInt(event.transaction.transactionIndex),
      logIndex: BigInt(event.log.logIndex),
    })
    .onConflictDoNothing();
});

ponder.on("PrincipleToken:PresaleBought", async ({ event, context }) => {
  const { db } = context;
  await db
    .insert(presaleBought)
    .values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      tokenId: event.args.tokenId,
      amount: event.args.amount,
      sender: event.args.sender,
      transactionHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionIndex: BigInt(event.transaction.transactionIndex),
      logIndex: BigInt(event.log.logIndex),
    })
    .onConflictDoNothing();
});

ponder.on(
  "PrincipleToken:PrincipleGuardDeployed",
  async ({ event, context }) => {
    const { db } = context;
    await db
      .insert(deployGuard)
      .values({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        guard: event.args.guard as `0x${string}`,
        yield: event.args.yield as `0x${string}`,
        floorTick: BigInt(event.args.floorTick),
        bal: event.args.bal,
        transactionHash: event.transaction.hash,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionIndex: BigInt(event.transaction.transactionIndex),
        logIndex: BigInt(event.log.logIndex),
      })
      .onConflictDoNothing();
  },
);

ponder.on("PrincipleToken:PropertyRegistered", async ({ event, context }) => {
  const { db } = context;
  await db
    .insert(propertyRegistered)
    .values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      owner: event.args.owner,
      tokenId: event.args.tokenId,
      metadataURI: event.args.metadataURI,
      transactionHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionIndex: BigInt(event.transaction.transactionIndex),
      logIndex: BigInt(event.log.logIndex),
    })
    .onConflictDoNothing();
});

ponder.on("PrincipleToken:PlatformFeeMinted", async ({ event, context }) => {
  const { db } = context;
  await db
    .insert(platformFeeMinted)
    .values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      treasury: event.args.treasury,
      tokenId: event.args.tokenId,
      amount: event.args.amount,
      transactionHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionIndex: BigInt(event.transaction.transactionIndex),
      logIndex: BigInt(event.log.logIndex),
    })
    .onConflictDoNothing();
});

ponder.on("PrincipleToken:YieldDistributed", async ({ event, context }) => {
  const { db } = context;
  await db
    .insert(yieldDistributed)
    .values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      tokenId: event.args.tokenId,
      holderShare: event.args.holderShare,
      baselineShare: event.args.baselineShare,
      platformShare: event.args.platformShare,
      distributedAt: event.args.timestamp,
      transactionHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionIndex: BigInt(event.transaction.transactionIndex),
      logIndex: BigInt(event.log.logIndex),
    })
    .onConflictDoNothing();
});

ponder.on("PrincipleToken:ReportAcknowledged", async ({ event, context }) => {
  const { db } = context;
  await db
    .insert(reportAcknowledged)
    .values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      tokenId: event.args.tokenId,
      acknowledgedAt: event.args.timestamp,
      transactionHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionIndex: BigInt(event.transaction.transactionIndex),
      logIndex: BigInt(event.log.logIndex),
    })
    .onConflictDoNothing();
});

ponder.on("PrincipleToken:Wrapped", async ({ event, context }) => {
  const { db } = context;
  await db
    .insert(wrapped)
    .values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      tokenId: event.args.tokenId,
      user: event.args.user,
      amount: event.args.amount,
      transactionHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionIndex: BigInt(event.transaction.transactionIndex),
      logIndex: BigInt(event.log.logIndex),
    })
    .onConflictDoNothing();
});

ponder.on("PrincipleToken:Unwrapped", async ({ event, context }) => {
  const { db } = context;
  await db
    .insert(unwrapped)
    .values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      tokenId: event.args.tokenId,
      user: event.args.user,
      amount: event.args.amount,
      transactionHash: event.transaction.hash,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionIndex: BigInt(event.transaction.transactionIndex),
      logIndex: BigInt(event.log.logIndex),
    })
    .onConflictDoNothing();
});
