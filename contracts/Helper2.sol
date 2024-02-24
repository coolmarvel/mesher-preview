// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract Helper {
  using SafeERC20 for IERC20;

  IUniswapV2Router02 public router;
  IUniswapV2Factory public factory;

  constructor(address _router, address _factory) {
    router = IUniswapV2Router02(_router); // 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    factory = IUniswapV2Factory(_factory); // 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f
  }

  // 토큰 A와 토큰 B의 pair 조회
  function getPair(address _tokenA, address _tokenB) public view returns (address) {
    return factory.getPair(_tokenA, _tokenB);
  }

  // 토큰 A와 토큰 B의 pair 생성 (이미 있으면 생성 x)
  function createPair(address _tokenA, address _tokenB) public returns (address) {
    address pair = this.getPair(_tokenA, _tokenB);
    require(pair != address(0), "Already exist pair");

    return factory.createPair(_tokenA, _tokenB);
  }

  // 토큰 A와 토큰 B의 풀 내의 유동성 잔액 조회
  function getTokenReserves(address _tokenA, address _tokenB) public view returns (uint256, uint256) {
    address pairAddress = this.getPair(_tokenA, _tokenB);
    if (pairAddress == address(0)) return (0, 0);

    IUniswapV2Pair pair = IUniswapV2Pair(pairAddress);
    (uint112 reserveA, uint112 reserveB, ) = pair.getReserves();

    return (reserveA, reserveB);
  }

  // 토큰 A와 토큰 B의 풀의 LP 토큰 공급량 조회
  function getLiquidity(address _tokenA, address _tokenB) public view returns (uint256) {
    address pairAddress = this.getPair(_tokenA, _tokenB);
    if (pairAddress == address(0)) return 0;

    IUniswapV2Pair pair = IUniswapV2Pair(pairAddress);
    return pair.totalSupply();
  }

  // 단일 토큰으로 유동성 추가
  function singleTokenAddLiquidity1(IUniswapV2Pair pair, address tokenA, uint256 singleAmount, address to, uint256 deadline) external {
    IERC20(tokenA).transferFrom(msg.sender, address(this), singleAmount);

    // 토큰 B 주소 얻기
    address tokenB = pair.token1() == tokenA ? pair.token0() : pair.token1();

    // 토큰 A의 절반을 토큰 B로 스왑
    uint256 swapAmount = singleAmount / 2;
    IERC20(tokenA).approve(address(router), swapAmount);
    address[] memory path = new address[](2);
    path[0] = tokenA;
    path[1] = tokenB;
    router.swapExactTokensForTokens(swapAmount, 0, path, address(this), deadline);

    // 스왑 후 토큰 B 잔액 확인
    uint256 tokenBBalance = IERC20(tokenB).balanceOf(address(this));

    // 유동성 추가
    IERC20(tokenB).approve(address(router), tokenBBalance);
    router.addLiquidity(tokenA, tokenB, singleAmount - swapAmount, tokenBBalance, 0, 0, to, deadline);

    // LP 토큰을 사용자에게 전송
    address lpTokenAddress = address(pair); // 타입 캐스팅
    uint256 lpTokenBalance = IERC20(lpTokenAddress).balanceOf(address(this));
    IERC20(lpTokenAddress).transfer(to, lpTokenBalance);

    // 잔여 토큰 반환
    uint256 remainingTokenA = IERC20(tokenA).balanceOf(address(this));
    uint256 remainingTokenB = IERC20(tokenB).balanceOf(address(this));

    if (remainingTokenA > 0) {
      IERC20(tokenA).transfer(msg.sender, remainingTokenA);
    }

    if (remainingTokenB > 0) {
      IERC20(tokenB).transfer(msg.sender, remainingTokenB);
    }
  }

  function singleTokenAddLiquidity2(IUniswapV2Pair _pair, address _token, uint256 _amount, address _to, uint256 _deadline) external {
    require(_deadline >= block.timestamp, "deadline can't less than current time");
    require(_amount > 0, "amounts can't less than 0");
    if (_amount > 0) _receiveToken(_token, _amount);

    address _otherToken = _pair.token1() == _token ? _pair.token0() : _pair.token1();

    _swapAndAddLiquidity(_token, _otherToken, _amount, _to);

    _returnLPToken(_pair, _to);

    _returnRemaingTokens(_token, _otherToken);
  }

  function _receiveToken(address _token, uint256 _amount) internal {
    IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
  }

  function _swapAndAddLiquidity(address _tokenA, address _tokenB, uint256 _amount, address _to) internal {
    (uint256 _amountA, uint256 _amountB) = _swapToSyncRatio(_tokenA, _tokenB, _amount);

    _approveTokenToRouter(_tokenA, _amountA);
    _approveTokenToRouter(_tokenB, _amountB);
    router.addLiquidity(_tokenA, _tokenB, _amountA, _amountB, 0, 0, _to, 2 ** 256 - 1);
  }

  function _swapToSyncRatio(address _tokenA, address _tokenB, uint256 _amount) internal returns (uint256, uint256) {
    (uint256 _reserveA, uint256 _reserveB) = this.getTokenReserves(_tokenA, _tokenB);
    require(_reserveA > 0 && _reserveB > 0, "There is no remaining reserves");

    uint256 _amountToSwap = _amount / 2;
    _approveTokenToRouter(_tokenA, _amountToSwap);

    address[] memory path = new address[](2);
    path[0] = _tokenA;
    path[1] = _tokenB;

    router.swapExactTokensForTokens(_amountToSwap, 0, path, address(this), 2 ** 256 - 1);

    uint256 _amountA = _amount - _amountToSwap;
    uint256 _amountB = IERC20(_tokenB).balanceOf(address(this));

    return (_amountA, _amountB);
  }

  function _approveTokenToRouter(address _token, uint256 _amount) internal {
    uint256 allowance = IERC20(_token).allowance(address(this), address(router));

    if (allowance < _amount) IERC20(_token).safeIncreaseAllowance(address(router), 2 ** 256 - 1 - allowance);
  }

  function _returnLPToken(IUniswapV2Pair _pair, address _to) internal {
    address lpTokenAddress = address(_pair);
    uint256 lpTokenBalance = IERC20(lpTokenAddress).balanceOf(address(this));
    IERC20(lpTokenAddress).safeTransfer(_to, lpTokenBalance);
  }

  function _returnRemaingTokens(address _tokenA, address _tokenB) internal {
    uint256 remainingTokenA = IERC20(_tokenA).balanceOf(address(this));
    uint256 remainingTokenB = IERC20(_tokenB).balanceOf(address(this));

    if (remainingTokenA > 0) {
      IERC20(_tokenA).transfer(msg.sender, remainingTokenA);
    }

    if (remainingTokenB > 0) {
      IERC20(_tokenB).transfer(msg.sender, remainingTokenB);
    }
  }
}
