// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract Helper {
  IUniswapV2Router02 public immutable uniswapV2Router;

  constructor(address router_) {
    uniswapV2Router = IUniswapV2Router02(router_);
  }

  function singleTokenAddLiquidity(address tokenA, address tokenB, uint256 singleAmount, address to, uint256 deadline) external {
    IERC20(tokenA).transferFrom(msg.sender, address(this), singleAmount);
    IERC20(tokenA).approve(address(uniswapV2Router), singleAmount);

    uint256 swapAmount = singleAmount / 2;
    uint256 remainingAmount = singleAmount - swapAmount;

    address[] memory path = new address[](2);
    path[0] = tokenA;
    path[1] = tokenB;

    uniswapV2Router.swapExactTokensForTokens(swapAmount, 0, path, address(this), deadline);

    uint256 tokenBBalance = IERC20(tokenB).balanceOf(address(this));
    IERC20(tokenB).approve(address(uniswapV2Router), tokenBBalance);

    uniswapV2Router.addLiquidity(tokenA, tokenB, remainingAmount, tokenBBalance, 0, 0, to, deadline);

    uint256 remainingTokenA = IERC20(tokenA).balanceOf(address(this));
    uint256 remainingTokenB = IERC20(tokenB).balanceOf(address(this));
    if (remainingTokenA > 0) {
      IERC20(tokenA).transfer(msg.sender, remainingTokenA);
    }
    if (remainingTokenB > 0) {
      IERC20(tokenB).transfer(msg.sender, remainingTokenB);
    }
  }
}
