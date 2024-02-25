import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("Helpver V1 Test", () => {
  let owner: any;
  let user1: any;
  let user2: any;

  let mat: any;
  let mbt: any;
  let helperV1: any;

  let router: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  let factory: string = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

  before(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    mat = await Token.deploy("MesherAToken", "MAT");
    mbt = await Token.deploy("MesherBToken", "MBT");

    const HelperV1 = await ethers.getContractFactory("HelperV1");
    helperV1 = await upgrades.deployProxy(HelperV1, [router, factory]);
  });

  describe("Deployment", () => {
    it("base", async () => {
      console.log(`MAT: `, await mat.getAddress());
      console.log(`MBT: `, await mbt.getAddress());
      console.log(`HelperV1: `, await helperV1.getAddress());

      expect(await mat.name()).to.equal("MesherAToken");
      expect(await mbt.name()).to.equal("MesherBToken");
      expect(await mat.symbol()).to.equal("MAT");
      expect(await mbt.symbol()).to.equal("MBT");

      expect(ethers.formatEther(await mat.totalSupply())).to.equal("1000000.0");
      expect(ethers.formatEther(await mbt.totalSupply())).to.equal("1000000.0");

      console.log(`MAT totalSupply: `, ethers.formatEther(await mat.totalSupply()));
      console.log(`MBT totalSupply: `, ethers.formatEther(await mbt.totalSupply()));
    });
  });

  describe("Transfer to user1, user2", () => {
    it("should transfer MAT 100,000 to user1", async () => {
      await mat.connect(owner).transfer(user1.address, ethers.parseEther("100000"));

      const user1MatBalance = ethers.formatEther(await mat.balanceOf(user1.address));
      const user1MbtBalance = ethers.formatEther(await mbt.balanceOf(user1.address));

      expect(user1MatBalance).to.equal("100000.0");
      expect(user1MbtBalance).to.equal("0.0");

      console.log(`user1's MAT balance: ${user1MatBalance}`);
      console.log(`user1's MBT balance: ${user1MbtBalance}`);
    });

    it("should transfer MBT 100,000 to user2", async () => {
      await mbt.connect(owner).transfer(user2.address, ethers.parseEther("100000"));

      const user2MatBalance = ethers.formatEther(await mat.balanceOf(user2.address));
      const user2MbtBalance = ethers.formatEther(await mbt.balanceOf(user2.address));

      expect(user2MatBalance).to.equal("0.0");
      expect(user2MbtBalance).to.equal("100000.0");

      console.log(`user2's MAT balance: ${user2MatBalance}`);
      console.log(`user2's MBT balance: ${user2MbtBalance}`);
    });

    it("after transfer owner balance", async () => {
      const ownerMatBalance = ethers.formatEther(await mat.balanceOf(owner.address));
      const ownerMbtBalance = ethers.formatEther(await mbt.balanceOf(owner.address));

      expect(ownerMatBalance).to.equal("900000.0");
      expect(ownerMbtBalance).to.equal("900000.0");

      console.log(`owner's MAT balance: ${ownerMatBalance}`);
      console.log(`owner's MBT balance: ${ownerMbtBalance}`);
    });
  });

  describe("MAT-MBT Pair initiate", () => {
    it("should MAT-MBT pair address equal 0x0", async () => {
      const pair = await helperV1.getPair(await mat.getAddress(), await mbt.getAddress());

      expect(pair).to.equal("0x0000000000000000000000000000000000000000");

      console.log(`MAT-MBT pair address: ${pair}`);
    });

    it("after MAT-MBT Pair initiated", async () => {
      await helperV1.createPair(await mat.getAddress(), await mbt.getAddress());

      const pair = await helperV1.getPair(await mat.getAddress(), await mbt.getAddress());

      expect(pair).not.to.equal("0x0000000000000000000000000000000000000000");

      console.log(`MAT-MBT pair address: ${pair}`);
    });
  });

  describe("MAT-MBT Pool initiate", () => {
    it("should MAT-MBT pool reserve equal 0", async () => {
      const reserves = await helperV1.getTokenReserves(await mat.getAddress(), await mbt.getAddress());
      const matReserve = ethers.formatEther(reserves[0]);
      const mbtReserve = ethers.formatEther(reserves[1]);

      expect(matReserve).to.equal("0.0");
      expect(mbtReserve).to.equal("0.0");

      console.log(`MAT reserve: ${matReserve}`);
      console.log(`MBT reserve: ${mbtReserve}`);
    });

    it("should owner approve to helper for add liquidity", async () => {
      await mat.connect(owner).approve(await helperV1.getAddress(), ethers.parseEther("100000"));
      await mbt.connect(owner).approve(await helperV1.getAddress(), ethers.parseEther("100000"));

      const matAllowance = ethers.formatEther(await mat.allowance(owner.address, await helperV1.getAddress()));
      const mbtAllowance = ethers.formatEther(await mbt.allowance(owner.address, await helperV1.getAddress()));

      expect(matAllowance).to.equal("100000.0");
      expect(mbtAllowance).to.equal("100000.0");

      console.log("owner -> helper(MAT allowance): ", matAllowance);
      console.log("owner -> helper(MBT allowance): ", mbtAllowance);
    });

    it("after MAT-MBT pool provide liquidity", async () => {
      const beforeLpBalance = ethers.formatEther(await helperV1.searchLPTokenBalance(await mat.getAddress(), await mbt.getAddress(), owner.address));

      expect(beforeLpBalance).to.equal("0.0");

      console.log(`owner's MAT-MBT LP balance: ${beforeLpBalance}`);

      await helperV1.connect(owner).provideLiquidity(await mat.getAddress(), await mbt.getAddress(), ethers.parseEther("100000"), ethers.parseEther("100000"));

      const reserves = await helperV1.getTokenReserves(await mat.getAddress(), await mbt.getAddress());
      const matReserve = ethers.formatEther(reserves[0]);
      const mbtReserve = ethers.formatEther(reserves[1]);

      expect(matReserve).to.equal("100000.0");
      expect(mbtReserve).to.equal("100000.0");

      console.log(`MAT reserve: ${matReserve}`);
      console.log(`MBT reserve: ${mbtReserve}`);

      const afterLpBalance = ethers.formatEther(await helperV1.searchLPTokenBalance(await mat.getAddress(), await mbt.getAddress(), owner.address));

      expect(afterLpBalance).not.to.equal("0.0");

      console.log(`owner's MAT-MBT LP balance: ${afterLpBalance}`);
    });
  });

  describe("user1 test", () => {
    it("should user1 approve to helper for singleTokenAddLiquidity", async () => {
      await mat.connect(user1).approve(await helperV1.getAddress(), ethers.parseEther("1000"));

      const matAllowance = ethers.formatEther(await mat.allowance(user1.address, await helperV1.getAddress()));

      expect(matAllowance).to.equal("1000.0");

      console.log("user1 -> helper(MAT allowance): ", matAllowance);
    });

    it("user1 singleTokenAddLiquidity MAT(1,000)", async () => {
      const beforeLpBalance = ethers.formatEther(await helperV1.searchLPTokenBalance(await mat.getAddress(), await mbt.getAddress(), user1.address));

      expect(beforeLpBalance).to.equal("0.0");

      console.log(`user1's MAT-MBT LP balance: ${beforeLpBalance}`);

      const pair = await helperV1.getPair(await mat.getAddress(), await mbt.getAddress());

      await helperV1.connect(user1).singleTokenAddLiquidity(pair, await mat.getAddress(), ethers.parseEther("1000"), user1.address, Math.floor(Date.now() / 1000) + 600);

      const reserves = await helperV1.getTokenReserves(await mat.getAddress(), await mbt.getAddress());
      const matReserve = ethers.formatEther(reserves[0]);
      const mbtReserve = ethers.formatEther(reserves[1]);

      expect(matReserve).not.to.equal("100000.0");
      expect(mbtReserve).not.to.equal("100000.0");

      console.log(`MAT reserve: ${matReserve}`);
      console.log(`MBT reserve: ${mbtReserve}`);

      const afterLpBalance = ethers.formatEther(await helperV1.searchLPTokenBalance(await mat.getAddress(), await mbt.getAddress(), user1.address));

      expect(afterLpBalance).not.to.equal("0.0");

      console.log(`user1's MAT-MBT LP balance: ${afterLpBalance}`);

      const afterMatBalance = ethers.formatEther(await mat.balanceOf(user1.address));
      const afterMbtBalance = ethers.formatEther(await mbt.balanceOf(user1.address));

      expect(afterMatBalance).not.to.equal("100000.0");
      expect(afterMbtBalance).not.to.equal("100000.0");

      console.log(`user1's MAT balance: ${afterMatBalance}`);
      console.log(`user1's MBT balance: ${afterMbtBalance}`);
    });
  });

  describe("user2 test", () => {
    it("should user2 approve to helper for singleTokenAddLiquidity", async () => {
      await mbt.connect(user2).approve(await helperV1.getAddress(), ethers.parseEther("1000"));

      const mbtAllowance = ethers.formatEther(await mbt.allowance(user2.address, await helperV1.getAddress()));

      expect(mbtAllowance).to.equal("1000.0");

      console.log("user2 -> helper(MBT allowance): ", mbtAllowance);
    });

    it("user2 singleTokenAddLiquidity MBT(1,000)", async () => {
      const beforeLpBalance = ethers.formatEther(await helperV1.searchLPTokenBalance(await mat.getAddress(), await mbt.getAddress(), user2.address));

      expect(beforeLpBalance).to.equal("0.0");

      console.log(`user2's MAT-MBT LP balance: ${beforeLpBalance}`);

      const pair = await helperV1.getPair(await mat.getAddress(), await mbt.getAddress());

      await helperV1.connect(user2).singleTokenAddLiquidity(pair, await mbt.getAddress(), ethers.parseEther("1000"), user2.address, Math.floor(Date.now() / 1000) + 600);

      const reserves = await helperV1.getTokenReserves(await mat.getAddress(), await mbt.getAddress());
      const matReserve = ethers.formatEther(reserves[0]);
      const mbtReserve = ethers.formatEther(reserves[1]);

      expect(matReserve).not.to.equal("100000.0");
      expect(mbtReserve).not.to.equal("100000.0");

      console.log(`MAT reserve: ${matReserve}`);
      console.log(`MBT reserve: ${mbtReserve}`);

      const afterLpBalance = ethers.formatEther(await helperV1.searchLPTokenBalance(await mat.getAddress(), await mbt.getAddress(), user2.address));

      expect(afterLpBalance).not.to.equal("0.0");

      console.log(`user2's MAT-MBT LP balance: ${afterLpBalance}`);

      const afterMatBalance = ethers.formatEther(await mat.balanceOf(user2.address));
      const afterMbtBalance = ethers.formatEther(await mbt.balanceOf(user2.address));

      expect(afterMatBalance).not.to.equal("100000.0");
      expect(afterMbtBalance).not.to.equal("100000.0");

      console.log(`user2's MAT balance: ${afterMatBalance}`);
      console.log(`user2's MBT balance: ${afterMbtBalance}`);
    });

    it("should helper contract have no balance", async () => {
      const matBalance = ethers.formatEther(await mat.balanceOf(await helperV1.getAddress()));
      const mbtBalance = ethers.formatEther(await mbt.balanceOf(await helperV1.getAddress()));

      expect(matBalance).to.equal("0.0");
      expect(mbtBalance).to.equal("0.0");

      console.log(`helper's MAT balance: ${matBalance}`);
      console.log(`helper's MBT balance: ${mbtBalance}`);

      const lpBalance = ethers.formatEther(await helperV1.searchLPTokenBalance(await mat.getAddress(), await mbt.getAddress(), await helperV1.getAddress()));

      expect(lpBalance).to.equal("0.0");

      console.log(`helper's LP balance: ${lpBalance}`);
    });
  });
});
