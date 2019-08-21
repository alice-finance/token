# Alice Token

This repository contains Solidity contracts for Alice Finance.


## Deployed Addresses

Below contracts are deployed on Loom Network's [PlasmaChain](https://loomx.io/developers/en/intro-to-loom.html#what-is-plasmachain).

| Contract                    | Address                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| AliceFund                   | [0xc1bea036f63e88d65306e8513db9bfee5d8b5268](http://loom-blockexplorer.dappchains.com/address/0xc1bea036f63e88d65306e8513db9bfee5d8b5268) |
| AliceIFO                    | [0xc7bb19a92c1a050087b0633c6e4cb4bf363053d9](http://loom-blockexplorer.dappchains.com/address/0xc7bb19a92c1a050087b0633c6e4cb4bf363053d9) |
| AlicePlasma                 | [0x60f27e0a85c1f923ea29967c847245149d46cfee](http://loom-blockexplorer.dappchains.com/address/0x60f27e0a85c1f923ea29967c847245149d46cfee) |

And below contracts are deployed on Ethereum Network

| Contract                    | Address                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Alice                       | [0x33dcd369d697132de252884336225de31fb474b2](https://etherscan.io/address/0x33dcd369d697132de252884336225de31fb474b2)                       |

## Development

First, install Node.js and yarn. Then grep the source code.

### Get the source

Fork this repo and clone it to your local machine:

```shell
$ git clone git@github.com:your-username/alice-token.git
```

Once git clone is done, use yarn to install dependencies:

```shell
$ yarn install
```

### Deploy

To deploy, we use truffle. 

```shell
$ npx truffle deploy 
```

If you want to deploy contracts to testnet, you need `.env` file. Use `.env.sample` to make your own `.env` file.

### Test

To run tests, run command below:

```bash
$ yarn test
```

To get coverage report, run command below:

```shell
$ yarn test:coverage
```

## Contributing

We always appreciate your contributions. Please create an issue in this repository to report bugs or suggestions.

If you have security concerns or discovered problems related to security, please contact us on Telegram - [Alice Developers](https://t.me/alicefinancedevs).



## License

Alice Token is licensed under the [MIT License](/LICENSE).
