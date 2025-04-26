pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {CookieJarRegistry} from "../src/CookieJarRegistry.sol";
import {CookieJarFactory} from "../src/CookieJarFactory.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {CookieJarLib} from "../src/libraries/CookieJarLib.sol";
import {CookieJar} from "../src/CookieJar.sol";

import "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721Mock is ERC721 {
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}

contract Deploy is Script {
    HelperConfig helperConfig;
    HelperConfig.NetworkConfig config;

    function run() public {
        // Load configuration and deployer
        helperConfig = new HelperConfig();
        config = helperConfig.getAnvilConfig();
        // uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        // address deployer = vm.addr(deployerPrivateKey);

        address deployer = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        vm.startBroadcast(deployer);

        // Deploy Registry
        CookieJarRegistry registry = new CookieJarRegistry();
        console.log("CookieJarRegistry deployed at:", address(registry));

        // Deploy Factory with Registry address
        CookieJarFactory factory = new CookieJarFactory(
            config.defaultFeeCollector,
            address(registry),
            0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
            config.feePercentageOnDeposit,
            config.minETHDeposit,
            config.minERC20Deposit
        );
        console.log("CookieJarFactory deployed at:", address(factory));

        // Set Factory in Registry
        registry.setCookieJarFactory(address(factory));

        // Deploy an ERC20 mock and mint tokens for testing
        ERC20Mock testToken = new ERC20Mock();
        testToken.mint(deployer, 100e18);

        console.log("ERC20Mock deployed at:", address(testToken));

        // Deploy an ERC721 mock and mint a token to deployer
        ERC721Mock erc721 = new ERC721Mock("TestNFT", "TNFT");
        erc721.mint(deployer, 1);
        console.log("ERC721Mock deployed at:", address(erc721));
        console.log("Token ID 1 minted to:", deployer);

        // Prepare parameters for NFT-gated CookieJar
        address cookieJarOwner = deployer;
        address supportedCurrency = address(3); // native ETH
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(erc721);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = uint8(CookieJarLib.NFTType.ERC721);
        uint256 fixedAmount = 0;
        uint256 maxWithdrawal = 1 ether;
        uint256 withdrawalInterval = 1 days;
        bool strictPurpose = false;
        bool emergencyWithdrawalEnabled = true;
        bool oneTimeWithdrawal = false;
        string memory metadata = "NFT-gated CookieJar";

        // Create the CookieJar
        address jarNFT = factory.createCookieJar(
            cookieJarOwner,
            supportedCurrency,
            CookieJarLib.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJarLib.WithdrawalTypeOptions.Variable,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            emergencyWithdrawalEnabled,
            oneTimeWithdrawal,
            metadata
        );
        console.log("CookieJar created at:", jarNFT);
        // CookieJar(payable(jarNFT)).depositETH{value: 100 ether}();
        // CookieJar(payable(jarNFT)).withdrawNFTMode(
        //     1 ether,
        //     "Test NFT-gated withdrawal from deployer",
        //     address(erc721),
        //     1
        // );
        // console.log("Withdrew 1 ETH using withdrawNFTMode()");

        vm.stopBroadcast();
    }
}
