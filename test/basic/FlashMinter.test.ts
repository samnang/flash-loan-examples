import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

import { FlashMinterMock, FlashBorrower } from "../../typechain-types";

describe("Basic / FlashMinter", async () => {
  let deployer: SignerWithAddress;
  let account1: SignerWithAddress;
  let lenderContractFactory: ContractFactory;
  let borrowerContractFactory: ContractFactory;
  let lenderContract: FlashMinterMock;
  let borrowerContract: FlashBorrower;
  const fee = 10; // 10 == 0.10 %

  beforeEach(async () => {
    [deployer, account1] = await ethers.getSigners();

    lenderContract = (await deployContract("FlashMinterMock", "Wrapped ETH", "WETH", fee)) as FlashMinterMock;
    borrowerContract = (await deployContract("FlashBorrower", lenderContract.address)) as FlashBorrower;
  });

  it("creates a flash loan", async () => {
    const loanAmount = 10000;
    const fee = await lenderContract.flashFee(lenderContract.address, loanAmount);
    await lenderContract.mint(borrowerContract.address, fee);

    await borrowerContract.connect(account1).flashBorrow(lenderContract.address, loanAmount);

    expect(await lenderContract.balanceOf(borrowerContract.address)).to.eq(0);
  });

  it("does not have enough balance to pay fees", async () => {
    const loanAmount = 10000;

    await expect(borrowerContract.connect(account1).flashBorrow(lenderContract.address, loanAmount)).to.be.revertedWith(
      "ERC20: burn amount exceeds balance"
    );
  });

  it("denies a flash loan from an unsupported token", async () => {
    await expect(
      lenderContract
        .connect(account1)
        .flashLoan(borrowerContract.address, ethers.constants.AddressZero, 1000, ethers.constants.HashZero)
    ).to.revertedWith("FlashMinter: Unsupported currency");
  });

  async function deployContract(contractName: string, ...args: any[]): Promise<Contract> {
    const contractFactory = await ethers.getContractFactory(contractName, deployer);
    const contract = await contractFactory.deploy(...args);
    await contract.deployed();

    return contract;
  }
});
