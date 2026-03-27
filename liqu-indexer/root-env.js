const fs = require('fs');
const envExampleStr = `DATABASE_URL="postgresql://liqu_user:liqu_password@localhost:5432/liquprop"

PONDER_RPC_URL_1=""
PONDER_RPC_URL_84532=""

# CH_PT="0x11c434b5819e5732b456B7A83baddcaC6B568fb9"
# CH_ASSET="0xa77F3De3Ffa5764Fd4A9f09f854b9410fBaa9872"
# CH_FACTORY="0x11E3600Ea7621dC7133E131389253fF9a848AAA9"
# CH_GUARD_FACTORY="0x671b2AF4a57c27c63dD5b68c319e3Af460d8837C"
# CH_USDC="0x3905E5dd9ee76d863469994DD28Ae619178E2082"
# SWAP_ROUTER_PT_BASE_SEPOLIA="0x670543E131253eE598A41CAad956eb280b504338"
`;
fs.writeFileSync('/Users/hafidabi/hackathon/liquprop/liqu-indexer/.env.example', envExampleStr);
