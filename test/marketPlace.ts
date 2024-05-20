import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { deployNew } from "../utils/helper";

describe("DecentralizedMarketplace", function () {
  let marketplace: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  beforeEach(async function () {
    [ owner, addr1, addr2 ] = await ethers.getSigners();
    marketplace = await deployNew("DecentralizedMarketplace", []);
  });

  describe("User Registration", function () {
    it("Should register a new user", async function () {
      await marketplace.connect(addr1).registerUser("user1");
      const user = await marketplace.users(await addr1.getAddress());
      expect(user.username).to.equal("user1");
      expect(user.exists).to.be.true;
    });

    it("Should not allow duplicate registration", async function () {
      await marketplace.connect(addr1).registerUser("user1");
      await expect(marketplace.connect(addr1).registerUser("user1")).to.be.revertedWith("User already registered");
    });
  });

  describe("Item Listing", function () {
    beforeEach(async function () {
      await marketplace.connect(addr1).registerUser("user1");
    });

    it("Should list a new item", async function () {
      await marketplace.connect(addr1).listItem("Item1", "Description1", ethers.utils.parseEther("1"));
      const item = await marketplace.items(0);
      expect(item.name).to.equal("Item1");
      expect(item.description).to.equal("Description1");
      expect(item.price).to.equal(ethers.utils.parseEther("1"));
      expect(item.owner).to.equal(await addr1.getAddress());
      expect(item.available).to.be.true;
    });

    it("Should not allow listing with zero price", async function () {
      await expect(marketplace.connect(addr1).listItem("Item1", "Description1", 0)).to.be.revertedWith("Price must be greater than zero");
    });
  });

  describe("Item Purchase", function () {
    beforeEach(async function () {
      await marketplace.connect(addr1).registerUser("user1");
      await marketplace.connect(addr2).registerUser("user2");
      await marketplace.connect(addr1).listItem("Item1", "Description1", ethers.utils.parseEther("1"));
    });

    it("Should allow a registered user to purchase an item", async function () {
      await marketplace.connect(addr2).purchaseItem(0, { value: ethers.utils.parseEther("1") });
      const item = await marketplace.items(0);
      expect(item.available).to.be.false;
      expect(item.owner).to.equal(await addr2.getAddress());

      const purchases = await marketplace.getUserPurchases(await addr2.getAddress());
      expect(purchases.length).to.equal(1);
      expect(purchases[0].itemId).to.equal(0);
      expect(purchases[0].price).to.equal(ethers.utils.parseEther("1"));
    });

    it("Should not allow purchasing with incorrect price", async function () {
      await expect(marketplace.connect(addr2).purchaseItem(0, { value: ethers.utils.parseEther("0.5") })).to.be.revertedWith("Incorrect price");
    });

    it("Should not allow purchasing an unavailable item", async function () {
      await marketplace.connect(addr2).purchaseItem(0, { value: ethers.utils.parseEther("1") });
      await expect(marketplace.connect(addr1).purchaseItem(0, { value: ethers.utils.parseEther("1") })).to.be.revertedWith("Item not available");
    });
  });

  describe("Funds Withdrawal", function () {
    beforeEach(async function () {
      await marketplace.connect(addr1).registerUser("user1");
      await marketplace.connect(addr2).registerUser("user2");
      await marketplace.connect(addr1).listItem("Item1", "Description1", ethers.utils.parseEther("1"));
    });

    it("Should allow a user to withdraw funds", async function () {
      await marketplace.connect(addr2).purchaseItem(0, { value: ethers.utils.parseEther("1") });
      const initialBalance = await ethers.provider.getBalance(await addr1.getAddress());
      await marketplace.connect(addr1).withdrawFunds();
      const finalBalance = await ethers.provider.getBalance(await addr1.getAddress());
      expect(finalBalance).to.be.above(initialBalance);
    });

    it("Should not allow withdrawing with no funds", async function () {
      await expect(marketplace.connect(addr1).withdrawFunds()).to.be.revertedWith("No funds to withdraw");
    });
  });
});