# ✅ Transaction savepoint — Backend Tasks
# Level: Application

## Context
when we interact with blockchain, we need to save the transaction hash to our database to track the transaction status. for example when we mint/start post a property for sale, we already interact with blockchain but we dont save the tx hash, we need to save the tx hash to our database to track the transaction status.

---

## Tasks

### 1. Database Schema — New Prisma Models 
- please add in chain like explorer url if not exist, for current seeder base sepolia please use this https://base-sepolia.blockscout.com/
- please add column to save tx hash and tx status to our database to track the transaction status for all transaction that interact with blockchain.


---

### 2. Logic adjustment and new api (if necessary)
- based on task no 1 please adjust the logic if it need to be have transaction column
- you also can create new api since tx hash happening after we got the body that we will hit the blockchain and get the tx, it may can hit api again for save the tx?? or you have other ideas

### 3. create task for frontend
- after implement this on backend, we need to show it to the frontend, please put task in ./liquprop-fe/tasks/transaction-savepoint.md





## Build & Lint
- `bun run build` must succeed with zero TypeScript errors
