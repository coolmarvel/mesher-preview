import { expect } from "chai";
import { ethers } from "hardhat";

describe("Token Contract Test", () => {
  let mat: any, mbt: any, owner: any, addr1: any, addr2: any;

  beforeEach(async () => {
    const [_owner, _addr1, _addr2] = await ethers.getSigners();
    owner = _owner;
    addr1 = _addr1;
    addr2 = _addr2;

    const Token = await ethers.getContractFactory("Token");
    mat = await Token.deploy("MesherAToken", "MAT");
    mbt = await Token.deploy("MesherBToken", "MBT");

    await mat.waitForDeployment();
    await mbt.waitForDeployment();
  });

  describe("Deployment", () => {
    it("should have correct name and symbol", async () => {
      console.log("MAT name:", await mat.name(), "|", "MAT symbol:", await mat.symbol());
      expect(await mat.name()).to.equal("MesherAToken");
      expect(await mat.symbol()).to.equal("MAT");

      console.log("MBT name:", await mbt.name(), "|", "MBT symbol:", await mbt.symbol());
      expect(await mbt.name()).to.equal("MesherBToken");
      expect(await mbt.symbol()).to.equal("MBT");
    });

    it("should assign the total supply of tokens to the owner", async () => {
      console.log("MAT totalSupply:", await mat.totalSupply(), "|", "owner balance:", await mat.balanceOf(owner.address));
      const ownersMATBalance = await mat.balanceOf(owner.address);
      expect(await mat.totalSupply()).to.equal(ownersMATBalance);

      console.log("MBT totalSupply:", await mat.totalSupply(), "|", "owner balance:", await mbt.balanceOf(owner.address));
      const ownersMBTBalance = await mat.balanceOf(owner.address);
      expect(await mat.totalSupply()).to.equal(ownersMBTBalance);
    });
  });

  describe("Transactions", () => {
    it("should transfer tokens between accounts", async () => {
      console.log("owner transfer to addr1, MAT 50 amount");
      await mat.transfer(addr1.address, 50);
      const addr1Balance = await mat.balanceOf(addr1.address);
      console.log(`addr1's balance: ${addr1Balance}`);
      expect(addr1Balance).to.equal(50);

      console.log("addr1 transfer to addr2, MAT 50 amount");
      await mat.connect(addr1).transfer(addr2.address, 50);
      const addr2Balance = await mat.balanceOf(addr2.address);
      console.log(`addr2's balance: ${addr2Balance}`);
      expect(addr2Balance).to.equal(50);
    });

    it("should fail sender have not enough tokens", async () => {
      const balance = await mat.balanceOf(owner.address);
      expect(await mat.connect(addr1).transfer(owner.address, 1)).to.be.reverted;
      expect(await mat.balanceOf(owner.address)).to.equal(balance);
    });

    it("should update balances after transactions", async () => {
      const balance = await mat.balanceOf(owner.address);
      await mat.transfer(addr1.address, 100);
      await mat.transfer(addr2.address, 50);

      const afterBalance = await mat.balanceOf(owner.address);
      expect(afterBalance).to.equal(balance - BigInt(150));

      const addr1Balance = await mat.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(100);

      const addr2Balance = await mat.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });
  });

  describe("Approvals", () => {
    it("should approve other account to spend token", async () => {
      await mat.approve(addr1.address, 100);
      const allowance = await mat.allowance(owner.address, addr1.address);
      expect(allowance).to.equal(100);
    });

    it("should not allow non-owners to approve", async () => {
      expect(await mat.connect(addr1).approve(owner.address, 100)).to.be.reverted;
    });

    it("should update allowance after approval", async () => {
      await mat.approve(addr1.address, 100);
      const allowance1 = await mat.allowance(owner.address, addr1.address);
      expect(allowance1).to.equal(100);

      await mat.approve(addr1.address, 200);
      const allowance2 = await mat.allowance(owner.address, addr1.address);
      expect(allowance2).to.equal(200);
    });
  });
});
