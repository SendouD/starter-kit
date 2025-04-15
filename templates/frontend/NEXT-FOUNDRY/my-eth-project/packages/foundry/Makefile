# setup wallet for anvil
setup-anvil-wallet:
	shx rm ~/.foundry/keystores/my-eth-project-default 2>/dev/null
	shx rm -rf broadcast/Deploy.s.sol/31337
	cast wallet import --private-key 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 --unsafe-password 'localhost' my-eth-project-default

chain: 
	anvil