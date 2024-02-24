import { expect } from "chai";
import { ethers } from "hardhat";

describe("Helper Contract Test", () => {
  let mat: any, mbt: any, helper: any;
  let owner: any;

  beforeEach(async () => {
    const [_owner] = await ethers.getSigners();
    owner = _owner;

    const Token = await ethers.getContractFactory("Token");
    mat = await Token.deploy("MesherAToken", "MAT");
    mbt = await Token.deploy("MesherBToken", "MBT");

    const Helper = await ethers.getContractFactory("Helper");
    helper = await Helper.deploy("0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E");

    await mat.waitForDeployment();
    await mbt.waitForDeployment();
    await helper.waitForDeployment();
  });

  describe("Deployment", () => {
    it("should have correct uniswap router", async () => {
      expect(await helper.uniswapV2Router()).to.equal("0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E");
    });
  });

  describe("MAT-MBT pool", () => {
    it("should allow single token liquidity", async () => {
      await mat.approve(await helper.getAddress(), ethers.parseUnits("500", 18));

      await helper.singleTokenAddLiquidity(await mat.getAddress(), await mbt.getAddress(), ethers.parseUnits("500", 18), owner.address, Math.floor(Date.now() / 1000) + 60 * 10);

      const helperMATBalance = await mat.balanceOf(helper.address);
      const helperMBTBalance = await mbt.balanceOf(helper.address);

      expect(helperMATBalance).to.equal(0);
      expect(helperMBTBalance).to.equal(0);
    });
  });
});
