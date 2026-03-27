# Task 02 — UI Components

## Goal
Build the core UI component library using shadcn/ui primitives.

## Tasks

- [x] Add shadcn/ui base components via CLI:
  - `npx shadcn@latest add button card badge`
  - `npx shadcn@latest add dialog sheet tabs`
  - `npx shadcn@latest add input label form`
  - `npx shadcn@latest add skeleton toast`
- [x] Create `src/components/layout/` folder:
  - `Header.tsx` — nav bar with logo + ConnectButton + nav links
  - `Footer.tsx` — links and copyright
  - `Layout.tsx` — wraps Header + main + Footer
- [x] Create `src/components/property/` folder:
  - `PropertyCard.tsx` — card showing property thumbnail, name, location, APY, price
  - `PropertyGrid.tsx` — responsive grid of PropertyCards
  - `PropertyBadge.tsx` — tokenized / listed / coming-soon status badge
- [x] Create `src/components/wallet/` folder:
  - `WalletInfo.tsx` — shows connected address + ENS + balance
  - `NetworkSwitcher.tsx` — dropdown to switch between supported chains

## Notes
- All components should use Tailwind utility classes + shadcn/ui primitives
- Export barrel files (`index.ts`) for each folder
