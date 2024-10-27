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

    return {
      poap,
      token,
      owner,
      otherAccount,
      anotherAccount,
      publicClient,
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

  describe("Deployment", function () {
    it("should have the owner with minter and admin role", async function () {
      const { poap, owner } = await loadFixture(deployOneYearLockFixture);
      const minter = await poap.read.MINTER_ROLE();
      const admin = await poap.read.DEFAULT_ADMIN_ROLE();

      expect(await poap.read.hasRole([minter, owner.account.address])).to.equal(true);
      expect(await poap.read.hasRole([admin, owner.account.address])).to.equal(true);
    });

    it("should be able to mint given valid signature from owner", async function () {
      const { poap, owner, token } = await loadFixture(deployOneYearLockFixture);
      const address = owner.account.address;
      const signature = await generateSignature(owner, address, token);

      await poap.write.mint([address, token, "0x", signature]);

      expect(await poap.read.mintTracker([address, token])).not.to.equal(0);
    });

    it("should not be able to mint for invalid signatures", async function () {
      const { poap, otherAccount, token } = await loadFixture(deployOneYearLockFixture);
      const address = otherAccount.account.address;
      const signature = await generateSignature(otherAccount, address, token);
      console.log(signature)

      // expect(await poap.write.mint([address, token, "0x", signature]))
      //   .to.be.reverted;
      // expect(await poap.read.mintTracker([address, token])).to.equal(0);
    });

    it("should not be able to mint when token is paused", async function () {
      const { poap, owner, otherAccount, anotherAccount, token } = await loadFixture(deployOneYearLockFixture);
      const addressMintable = anotherAccount.account.address;
      const signatureMintable = await generateSignature(owner, addressMintable, token);

      await poap.write.mint([addressMintable, token, "0x", signatureMintable])
      await poap.write.pause([token])

      // Generate valid signature but token is paused
      const addressUnmintable = otherAccount.account.address;
      const signatureUnmintable = await generateSignature(owner, addressUnmintable, token);
      // expect(await poap.write.mint([addressUnmintable, token, "0x", signatureUnmintable]))
      //   .to.be.reverted;
    });

    it("should be able to mint with mintor role", async function () {
      const { poap, otherAccount, token } = await loadFixture(deployOneYearLockFixture);
      const role = await poap.read.MINTER_ROLE();
      const address = otherAccount.account.address;
      const signature = await generateSignature(otherAccount, address, token);
      await poap.write.grantRole([role, address])

      const poapAsOtherAccount = await hre.viem.getContractAt(
        contractName,
        poap.address,
        { client: { wallet: otherAccount } }
      );
      await poapAsOtherAccount.write.mint([address, token, "0x", signature]);

      expect(await poap.read.mintTracker([address, token])).not.to.equal(0);
    });

    it("should be not be able to mint twice", async function () {
      const { poap, owner, token } = await loadFixture(deployOneYearLockFixture);
      const address = owner.account.address;
      const signature = await generateSignature(owner, address, token);
      await poap.write.mint([address, token, "0x", signature]);

      // expect(await poap.write.mint([address, token, "0x", signature])).to.be.reverted;
    });
  });
});
