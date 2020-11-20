# ERC20 State Channel Implementation

This repo contains a Token smart contract which contains a `settle` feature which helps users to sign transaction off-chain and settle once.

## Scenario:

The `Token.test.js` file contains a test script which runs a scenario representing state channel off-chain and on-chain settlements.

- For each transaction, users will sign a transfer transaction which will generate a receipt containing `signature` and `message hash`.
- These receipts will be stored to keep the track of each transaction.
- At the time of settlement, every receipt will be validated.
- After that, final balance will be calculated based on the off-chain transactions

- With the help of final balance, it will identify the `sender`, `receiver` and `amount` to transfer.
- The next step will be to get the signature of both the parties on message hash prepared with:
    - Sender
    - Receiver
    - Amount
    - Nonce (To keep a track of transactions settled on-chain between them)

- Finally, a settle() transaction will be sent to token contract for on-chain settlement.

## To run the tests:

Install packages needed to run the tests:
    
    npm install

To compile the contract:

    npm run compile

To run the tests:

    npm run test

This command will automatically launch the ganache-cli instance to run the script locally.
