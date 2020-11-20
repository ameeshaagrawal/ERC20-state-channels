require("@openzeppelin/test-helpers/configure");
const { expect } = require("chai");
const { expectRevert } = require("@openzeppelin/test-helpers");

const TokenHelper = require("./Token.helper.js");
const Token = artifacts.require("Token");

contract("Token", (accounts) => {
  const admin = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];

  const name = "Test Token";
  const symbol = "TT";
  const decimals = 2;
  const amount = 1000;

  describe("State Channel", () => {
    beforeEach(async () => {
      this.tokenHelper = new TokenHelper(admin, user1, user2);
      const { token } = await this.tokenHelper.initScenario(
        name,
        symbol,
        decimals,
        amount
      );

      this.token = token;
    });

    describe("Signature and nonce validation", () => {
      beforeEach(async () => {
        this.txID = 1; //nonce

        //Transaction 1: user1 transfer 200 TT to user2
        this.amount = 200 * 10 ** decimals;
        let receipt = await this.tokenHelper.createTransferReceipt(
          user1,
          user2,
          this.amount,
          this.txID
        );

        this.isValid = await this.tokenHelper.verifySign(
          receipt.sign,
          receipt.sender,
          receipt.msgHash
        );

        //get signatures from both the users before settling the payment
        this.sign1 = await this.tokenHelper.signTransaction(
          user1,
          user2,
          this.amount,
          this.txID,
          user1
        );
        this.sign2 = await this.tokenHelper.signTransaction(
          user1,
          user2,
          this.amount,
          this.txID,
          user2
        );
      });

      it("should not settle if txId already used", async () => {
        //with the signatures, settle transaction on-chain in a single transaction
        await this.token.settle(
          user1,
          user2,
          this.amount,
          this.txID,
          this.sign1.signature,
          this.sign2.signature
        );

        //Should revert if someone tries to settle again
        await expectRevert(
          this.token.settle(
            user1,
            user2,
            this.amount,
            this.txID,
            this.sign1.signature,
            this.sign2.signature
          ),
          "Payment already settled"
        );
      });

      it("should not settle if signatures are reused with new nonce", async () => {
        //with the signatures, settle transaction on-chain in a single transaction
        await this.token.settle(
          user1,
          user2,
          this.amount,
          this.txID,
          this.sign1.signature,
          this.sign2.signature
        );

        //If txID is mainpulated, it should not verify the nonce in signatures
        await expectRevert(
          this.token.settle(
            user1,
            user2,
            this.amount,
            this.txID + 1,
            this.sign1.signature,
            this.sign2.signature
          ),
          "Invalid sender signature"
        );
      });
    });

    describe("Complete Scenario", () => {
      it("should settle balances after off chain transactions", async () => {
        const initialBalUser1 = await this.token.balanceOf(user1);
        const initialBalUser2 = await this.token.balanceOf(user2);

        let txID = 1; //nonce
        let amount, finalBalUser1, finalBalUser2;
        let receipts = [];

        //Transaction 1: user1 transfer 200 TT to user2
        amount = 200 * 10 ** decimals;

        let receipt = await this.tokenHelper.createTransferReceipt(
          user1,
          user2,
          amount,
          txID
        );
        receipts.push(receipt);

        //update balances
        finalBalUser1 = initialBalUser1 - amount;
        finalBalUser2 = initialBalUser2 + amount;

        //Transaction 2: user2 transfer 800 TT to user1
        amount = 800 * 10 ** decimals;

        receipt = await this.tokenHelper.createTransferReceipt(
          user2,
          user1,
          amount,
          txID
        );
        receipts.push(receipt);

        //update balances
        finalBalUser1 = initialBalUser1 + amount;
        finalBalUser2 = initialBalUser2 - amount;

        //Now to settle on-chain, first all the receipts will be verified
        let validated = receipts.every(async (receipt) => {
          let isValid = await this.tokenHelper.verifySign(
            receipt.sign,
            receipt.sender,
            receipt.msgHash
          );
          return isValid;
        });

        expect(validated).to.be.true;

        if (finalBalUser1 <= initialBalUser1) {
          let toTransfer = initialBalUser1 - finalBalUser1;

          //get signatures from both the users before settling the payment
          sign1 = await this.tokenHelper.signTransaction(
            user1,
            user2,
            toTransfer,
            txID,
            user1
          );
          sign2 = await this.tokenHelper.signTransaction(
            user1,
            user2,
            toTransfer,
            txID,
            user2
          );

          //with the signatures, settle transaction on-chain in a single transaction
          await this.token.settle(
            user1,
            user2,
            toTransfer,
            txID,
            sign1.signature,
            sign2.signature
          );
        } else {
          let toTransfer = initialBalUser2 - finalBalUser2;

          //get signatures from both the users before settling the payment
          sign1 = await this.tokenHelper.signTransaction(
            user2,
            user1,
            toTransfer,
            txID,
            user1
          );
          sign2 = await this.tokenHelper.signTransaction(
            user2,
            user1,
            toTransfer,
            txID,
            user2
          );

          //with the signatures, settle transaction on-chain in a single transaction
          await this.token.settle(
            user2,
            user1,
            toTransfer,
            txID,
            sign2.signature,
            sign1.signature
          );
        }
      });
    });
  });
});
