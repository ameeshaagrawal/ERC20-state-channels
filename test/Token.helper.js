const { BN } = require("@openzeppelin/test-helpers");
const web3 = require("@openzeppelin/test-helpers/src/config/web3");
const abi = require("ethereumjs-abi");
const util = require("ethereumjs-util");

const w3 = web3.getWeb3();

const Token = artifacts.require("Token");
const ECRecovery = artifacts.require("ECRecovery");

class TokenHelper {
  constructor(_admin, _user1, _user2) {
    this.admin = _admin;
    this.user1 = _user1;
    this.user2 = _user2;
  }

  async initScenario(name, symbol, decimals, amount) {
    await this.deployContract(name, symbol, decimals);
    await this.allotTokens(decimals, amount);

    return { token: this.token };
  }

  async deployContract(name, symbol, decimals = 2) {
    const ecLib = await ECRecovery.new();

    await Token.link("ECRecovery", ecLib.address);
    this.token = await Token.new(name, symbol, decimals, {
      from: this.admin
    });
  }

  async allotTokens(decimals, amount) {
    //transfer tokens to user1 and user2 from admin
    let tokensToMint = amount * 10 ** decimals;
    tokensToMint = new BN(tokensToMint);

    await this.token.transfer(this.user1, tokensToMint, {
      from: this.admin
    });

    await this.token.transfer(this.user2, tokensToMint, {
      from: this.admin
    });
  }

  async signTransaction(from, to, amount, nonce, signer) {
    const messageHash = abi.soliditySHA3(
      ["address", "address", "uint256", "uint256"],
      [new BN(from, 16), new BN(to, 16), amount, nonce]
    );
    const signature = await w3.eth.sign(
      `0x${messageHash.toString("hex")}`,
      signer
    );
    return { signature, messageHash };
  }

  async verifySign(signature, expectedSigner, message) {
    let prefixedMessage = await this.prefixed(message);
    let signer = await this.recoverSigner(prefixedMessage, signature);
    return (
      signer.toLowerCase() === util.stripHexPrefix(expectedSigner).toLowerCase()
    );
  }

  async prefixed(hash) {
    return abi.soliditySHA3(
      ["string", "bytes32"],
      ["\x19Ethereum Signed Message:\n32", hash]
    );
  }

  async recoverSigner(message, signature) {
    let split = util.fromRpcSig(signature);
    let publicKey = util.ecrecover(message, split.v, split.r, split.s);
    let signer = util.pubToAddress(publicKey).toString("hex");
    return signer;
  }

  async createTransferReceipt(from, to, amount, txId) {
    let signature = await this.signTransaction(from, to, amount, txId, from);
    return {
      sign: signature.signature,
      msgHash: signature.messageHash,
      sender: from
    };
  }
}

module.exports = TokenHelper;
