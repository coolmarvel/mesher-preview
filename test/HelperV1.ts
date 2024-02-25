import { ethers, upgrades } from "hardhat";

describe("Helpver V1 Test", () => {
  let owner: any;

  let mat: any;
  let mbt: any;
  let helperV1: any;

  let router: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  let factory: string = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

  beforeEach(async () => {
    [owner] = await ethers.getSigners();

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
    });
  });
});
