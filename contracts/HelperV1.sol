// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract HelperV1 is Initializable, ReentrancyGuardUpgradeable {
  using SafeERC20Upgradeable for IERC20Upgradeable;

  IUniswapV2Router02 public router;
  IUniswapV2Factory public factory;

  function initialize(address _router, address _factory) public initializer {
    router = IUniswapV2Router02(_router);
    factory = IUniswapV2Factory(_factory);

    __ReentrancyGuard_init();
  }

  function getPair(address _tokenA, address _tokenB) public view returns (address) {
    return factory.getPair(_tokenA, _tokenB);
  }

  function createPair(address _tokenA, address _tokenB) public returns (address) {
    address pair = this.getPair(_tokenA, _tokenB);
    require(pair == address(0), "Already exist pair");

    return factory.createPair(_tokenA, _tokenB);
  }

  function getTokenReserves(address _tokenA, address _tokenB) public view returns (uint256, uint256) {
    address pairAddress = this.getPair(_tokenA, _tokenB);
    if (pairAddress == address(0)) return (0, 0);

    IUniswapV2Pair pair = IUniswapV2Pair(pairAddress);
    (uint112 reserveA, uint112 reserveB, ) = pair.getReserves();

    return (reserveA, reserveB);
  }

  function provideLiquidity(address _tokenA, address _tokenB, uint256 _amountA, uint256 _amountB) external nonReentrant {
    IERC20Upgradeable(_tokenA).safeTransferFrom(msg.sender, address(this), _amountA);
    IERC20Upgradeable(_tokenB).safeTransferFrom(msg.sender, address(this), _amountB);

    _approveTokenToRouter(_tokenA, _amountA);
    _approveTokenToRouter(_tokenB, _amountB);

    router.addLiquidity(_tokenA, _tokenB, _amountA, _amountB, 0, 0, msg.sender, 2 ** 256 - 1);
  }

  function searchLPTokenBalance(address _tokenA, address _tokenB) public view returns (uint256) {
    address pairAddress = factory.getPair(_tokenA, _tokenB);
    require(pairAddress != address(0), "Pair does not exist");

    return IERC20Upgradeable(pairAddress).balanceOf(msg.sender);
  }

  function singleTokenAddLiquidity(IUniswapV2Pair _pair, address _token, uint256 _amount, address _to, uint256 _deadline) external {
    require(_deadline >= block.timestamp, "deadline can't less than current time");
    require(_amount > 0, "amounts can't less than 0");
    if (_amount > 0) _receiveToken(_token, _amount);

    address _otherToken = _pair.token1() == _token ? _pair.token0() : _pair.token1();

    _swapAndAddLiquidity(_token, _otherToken, _amount, _to);

    _returnLPToken(_pair, _to);

    _returnRemaingTokens(_token, _otherToken);
  }

  function _receiveToken(address _token, uint256 _amount) internal {
    IERC20Upgradeable(_token).safeTransferFrom(msg.sender, address(this), _amount);
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
    uint256 _amountB = IERC20Upgradeable(_tokenB).balanceOf(address(this));

    return (_amountA, _amountB);
  }

  function _approveTokenToRouter(address _token, uint256 _amount) internal {
    uint256 allowance = IERC20Upgradeable(_token).allowance(address(this), address(router));

    if (allowance < _amount) IERC20Upgradeable(_token).safeIncreaseAllowance(address(router), 2 ** 256 - 1 - allowance);
  }

  function _returnLPToken(IUniswapV2Pair _pair, address _to) internal {
    address lpTokenAddress = address(_pair);
    uint256 lpTokenBalance = IERC20Upgradeable(lpTokenAddress).balanceOf(address(this));
    IERC20Upgradeable(lpTokenAddress).safeTransfer(_to, lpTokenBalance);
  }

  function _returnRemaingTokens(address _tokenA, address _tokenB) internal {
    uint256 remainingTokenA = IERC20Upgradeable(_tokenA).balanceOf(address(this));
    uint256 remainingTokenB = IERC20Upgradeable(_tokenB).balanceOf(address(this));

    if (remainingTokenA > 0) {
      IERC20Upgradeable(_tokenA).transfer(msg.sender, remainingTokenA);
    }

    if (remainingTokenB > 0) {
      IERC20Upgradeable(_tokenB).transfer(msg.sender, remainingTokenB);
    }
  }
}
