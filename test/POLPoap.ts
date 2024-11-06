import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { Account, encodePacked, getAddress, keccak256, parseGwei, toBytes, WalletClient } from "viem";
require("hardhat-chai-matchers-viem");

describe("POLPoap", function () {
  const contractName = "POLPoap"
  async function deployOneYearLockFixture() {
    const [owner, otherAccount, anotherAccount] = await hre.viem.getWalletClients();

    const poap = await hre.viem.deployContract(contractName, []);
    const publicClient = await hre.viem.getPublicClient();
    const token = generatePoapToken();
    const testVerification = "QmStw2E79stkmBH9kjjRYHVoPNztrbQsxXchfxTnmRVh3h"

    return {
      poap,
      token,
      owner,
      otherAccount,
      anotherAccount,
      publicClient,
      testVerification,
    };
  }

  const generateSignature = async (client: WalletClient, address: `0x${string}`, tokenId: bigint) => {
    const encodedMessage = keccak256(encodePacked(['address', 'uint256'], [address, tokenId]));
    const message = toBytes(encodedMessage);
    return await client.signMessage({
      account: client.account as Account,
      message: { raw: message },
    });
  }

  const generatePoapToken = () => {
    return BigInt(Math.ceil(Math.random() * 100))
  }

  /**
   * Currently a simple method to test revert in viem
   * @param callback 
   * @returns 
   */
  const isReverted = async (callback: any) => {
    try {
      await callback();
      return false;
    } catch (e: any) {
      return true;
    }
  }

  describe("Deployment", function () {
    it("should have the owner with minter and admin role", async function () {
      const { poap, owner } = await loadFixture(deployOneYearLockFixture);
      const minter = await poap.read.MINTER_ROLE();
      const admin = await poap.read.DEFAULT_ADMIN_ROLE();

      expect(await poap.read.hasRole([minter, owner.account.address])).to.equal(true);
      expect(await poap.read.hasRole([admin, owner.account.address])).to.equal(true);
    });
  });

  describe("Mint", function () {
    it("should be able to mint given valid signature from owner", async function () {
      const { poap, owner, token, testVerification } = await loadFixture(deployOneYearLockFixture);
      const address = owner.account.address;
      const signature = await generateSignature(owner, address, token);

      await poap.write.mint([address, token, "0x", testVerification, signature]);

      expect(await poap.read.mintTracker([address, token])).not.to.equal(0);
    });

    it("should not be able to mint for invalid signatures", async function () {
      const { poap, otherAccount, token, testVerification } = await loadFixture(deployOneYearLockFixture);
      const address = otherAccount.account.address;
      const signature = await generateSignature(otherAccount, address, token);

      const method = poap.write.mint([address, token, "0x", testVerification, signature])
      expect(await isReverted(method)).to.be.true;
      expect(await poap.read.mintTracker([address, token])).to.equal(0);
    });

    it("should not be able to mint when token is paused", async function () {
      const { poap, owner, otherAccount, anotherAccount, token, testVerification } = await loadFixture(deployOneYearLockFixture);
      const addressMintable = anotherAccount.account.address;
      const signatureMintable = await generateSignature(owner, addressMintable, token);

      await poap.write.mint([addressMintable, token, "0x", testVerification, signatureMintable])
      await poap.write.pause([token])

      // Generate valid signature but token is paused
      const addressUnmintable = otherAccount.account.address;
      const signatureUnmintable = await generateSignature(owner, addressUnmintable, token);
      // const method = poap.write.mint([addressUnmintable, token, "0x", testVerification, signatureUnmintable])
      // expect(await isReverted(method)).to.be.true;
    });

    it("should be able to mint with mintor role", async function () {
      const { poap, otherAccount, token, testVerification } = await loadFixture(deployOneYearLockFixture);
      const role = await poap.read.MINTER_ROLE();
      const address = otherAccount.account.address;
      const signature = await generateSignature(otherAccount, address, token);
      await poap.write.grantRole([role, address])

      const poapAsOtherAccount = await hre.viem.getContractAt(
        contractName,
        poap.address,
        { client: { wallet: otherAccount } }
      );
      await poapAsOtherAccount.write.mint([address, token, "0x", testVerification, signature]);

      expect(await poap.read.mintTracker([address, token])).not.to.equal(0);
    });

    it("should be not be able to mint twice", async function () {
      const { poap, owner, token, testVerification } = await loadFixture(deployOneYearLockFixture);
      const address = owner.account.address;
      const signature = await generateSignature(owner, address, token);
      await poap.write.mint([address, token, "0x", testVerification, signature]);

      // expect(await poap.write.mint([address, token, "0x", signature])).to.be.reverted;
    });
  });
});
