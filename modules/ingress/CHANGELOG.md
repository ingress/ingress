# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-beta.13](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.12...ingress@4.0.0-beta.13) (2020-07-24)

**Note:** Version bump only for package ingress





# [4.0.0-beta.12](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.11...ingress@4.0.0-beta.12) (2020-07-24)

**Note:** Version bump only for package ingress





# 4.0.0-beta.11 (2020-07-21)


### Bug Fixes

* **di:** get typing ([db535a6](https://github.com/ingress/ingress/commit/db535a6dc6fdc380bf0fe827fcf98153ef1b736f))
* add new default type converter ([7725b1f](https://github.com/ingress/ingress/commit/7725b1f49c77c3dd74f73ee905d5f018e023b145))
* adjust exports for portability ([517ef60](https://github.com/ingress/ingress/commit/517ef60e363af789570ed3181cba4a27f0d74b7d))
* better handling of falsy body values ([8afc23d](https://github.com/ingress/ingress/commit/8afc23d3b4f1dc5bbb784d60aaf7892c1549c266))
* default value for typeconverters ([1715508](https://github.com/ingress/ingress/commit/1715508f790be287b7c1410cab999065386abb37))
* don't set default host on listen ([a6c7200](https://github.com/ingress/ingress/commit/a6c720024753577b67a04c04efaa1ed1a92de1e8))
* ensure unique controller set ([c3dfd7b](https://github.com/ingress/ingress/commit/c3dfd7b5b40f6a98efc741892e7b0eb7c49e2a14))
* error when function arity is less than two ([b368003](https://github.com/ingress/ingress/commit/b36800323bee953312e66307f6c117ae15f052e0))
* export additional annotations ([ccfde1d](https://github.com/ingress/ingress/commit/ccfde1dd3aee95cf0c00a5d51699075d64313a36))
* export BaseAuthContext as an interface ([7f8a0d3](https://github.com/ingress/ingress/commit/7f8a0d34a3c8ad129b185776813e6885016b0436))
* export context token type and value ([f60c2b7](https://github.com/ingress/ingress/commit/f60c2b7f52dd3f37f270bebd32a9f38ab8f0aee5))
* export di ([9f92521](https://github.com/ingress/ingress/commit/9f92521ca5cd85e0680f9cde5f1b13894555d3d8))
* export statuscode ([220449c](https://github.com/ingress/ingress/commit/220449c35709eba9da23f0f42c02c01d61e6aef6))
* include search in url for route ([be19fec](https://github.com/ingress/ingress/commit/be19fec488b1fd4ffa78c38f5e82684a5d895279))
* loosen types for fromConnect ([fe47e95](https://github.com/ingress/ingress/commit/fe47e954e182839f162c03d40f0ea1ae0c72deb2))
* middleware function detection ([ab39b38](https://github.com/ingress/ingress/commit/ab39b3832a80e944b53e0cbeae426258c9eaa2db))
* only use defaulttypeconverters if non are provided ([9651d43](https://github.com/ingress/ingress/commit/9651d43119d8722ec00a7380cd1d319154fee3e2))
* route-recognizer uri regex encoding ([52cd56b](https://github.com/ingress/ingress/commit/52cd56b1cd16ae9c5039b3c12a98aeb85b979d09))
* type references ([2d4335e](https://github.com/ingress/ingress/commit/2d4335e7e360d8e95d3fa3115edb75a807ccfca8))
* usableForwardRef types ([ce9f173](https://github.com/ingress/ingress/commit/ce9f173a011886641f8e8e04579ba03706eb5c58))
* **di:** use Set for collectors ([1367451](https://github.com/ingress/ingress/commit/1367451b6ab708e8608e6d162a629dcc5b6e8969))
* use statusCode property of error ([5c5425e](https://github.com/ingress/ingress/commit/5c5425e0cc734802d49056d2c9f70670b58f16ac))
* **annotation:** allow multiple methods per route annotation ([c7daef3](https://github.com/ingress/ingress/commit/c7daef308f2e5bb7cbf06601f372c464ce4f0a72))


### Features

* **router:** websocket handling ([b494f17](https://github.com/ingress/ingress/commit/b494f171c29690cf64111887899e485fe0e22663))
* add context param annotation ([f2ad69f](https://github.com/ingress/ingress/commit/f2ad69f3392eeffda319203a4f17049d544ba173))
* add upgrade annotation ([2914241](https://github.com/ingress/ingress/commit/2914241f453dea418f926cb0de49701f93668dd2))
* allow paramter types to be a type converter and paramter extractors ([458f83e](https://github.com/ingress/ingress/commit/458f83e659a6174787b5fbabcb38edee1b344ac7))
* authenticate annotation ([a8b58ab](https://github.com/ingress/ingress/commit/a8b58ab0c1f29c047970062d302d5f2e0d585b4a))
* enable async parameter resolution ([6b34040](https://github.com/ingress/ingress/commit/6b34040a40432ad854dfec7f8c807bf2568f7fd1))
* fromConnect annotation ([5f804cd](https://github.com/ingress/ingress/commit/5f804cd8b9184938fbe47356738b5cda69f37671))
* ingress package ([2889abb](https://github.com/ingress/ingress/commit/2889abb9668e38a7b5b7769c6b77da3b419eed0d))
* lazy parse url ([78eb858](https://github.com/ingress/ingress/commit/78eb8588d73984bad2d41192477d9ff1e3dcd09c))
* public api ([c3c4ddf](https://github.com/ingress/ingress/commit/c3c4ddf8105304d32b4217fda32676e165cc1246))
* set 400 status code for failed parameter validation ([c71bdbe](https://github.com/ingress/ingress/commit/c71bdbe4430523c389ff75fc38251c6ce23a3f87))
* support prioritizing middleware ([c2e91c6](https://github.com/ingress/ingress/commit/c2e91c66b141dbb08d665de22b5756a13762255f))
* type as converter ([f11268c](https://github.com/ingress/ingress/commit/f11268ccf7bae5cd51e0e82ba7eb7eedcacc0843))
* type updates, api pruning ([a5f9b2f](https://github.com/ingress/ingress/commit/a5f9b2f660663875d09dbea921e1e25c1eb500b5))
* usableForwardRef ([d8e7eef](https://github.com/ingress/ingress/commit/d8e7eef8e5b26ed167241abef600ae28dd12cf0a))





# [4.0.0-beta.10](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.9...ingress@4.0.0-beta.10) (2020-06-30)


### Bug Fixes

* **di:** get typing ([9825184](https://github.com/ingress/ingress/commit/982518462384c112930ebf0b8be33f91d0f6c57e))


### Features

* **router:** websocket handling ([9ebfef9](https://github.com/ingress/ingress/commit/9ebfef96bb7173158b64dd6f140ac722e385e47e))
* add upgrade annotation ([854f714](https://github.com/ingress/ingress/commit/854f7145dce66d449e457d8d66b34a04b02f253a))





# [4.0.0-beta.9](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.8...ingress@4.0.0-beta.9) (2020-06-03)


### Bug Fixes

* usableForwardRef types ([a6eb99f](https://github.com/ingress/ingress/commit/a6eb99f238ad97018650f8140cadb58e8821fc24))





# [4.0.0-beta.8](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.7...ingress@4.0.0-beta.8) (2020-06-03)


### Features

* usableForwardRef ([7445806](https://github.com/ingress/ingress/commit/744580640944193a980910e5d675a1a17a0c612c))





# [4.0.0-beta.7](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.6...ingress@4.0.0-beta.7) (2020-06-02)


### Bug Fixes

* middleware function detection ([cee2543](https://github.com/ingress/ingress/commit/cee254330fb219f1b9e41991bbc2c065e592bb40))





# [4.0.0-beta.6](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.5...ingress@4.0.0-beta.6) (2020-06-02)


### Bug Fixes

* export statuscode ([b62e531](https://github.com/ingress/ingress/commit/b62e5319fb4fac4db385942d7e4aff2d39b039bf))





# [4.0.0-beta.5](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.4...ingress@4.0.0-beta.5) (2020-06-02)


### Bug Fixes

* export additional annotations ([7df74a2](https://github.com/ingress/ingress/commit/7df74a25222145b545fff1fcf87369f493a8e7e0))





# [4.0.0-beta.4](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.3...ingress@4.0.0-beta.4) (2020-06-02)


### Features

* type updates, api pruning ([94f10fd](https://github.com/ingress/ingress/commit/94f10fd930a0f35e5c3a40361cd224e93a427f85))





# [4.0.0-beta.3](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.2...ingress@4.0.0-beta.3) (2020-05-23)


### Features

* allow paramter types to be a type converter and paramter extractors ([010ad7d](https://github.com/ingress/ingress/commit/010ad7db075e121da8e0b9c3290fae95c6051b54))





# [4.0.0-beta.2](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.1...ingress@4.0.0-beta.2) (2020-05-19)


### Bug Fixes

* type references ([21bc391](https://github.com/ingress/ingress/commit/21bc3916c097dcd9186740198a795fb2bc695c38))





# [4.0.0-beta.1](https://github.com/ingress/ingress/compare/ingress@4.0.0-beta.0...ingress@4.0.0-beta.1) (2020-05-19)


### Bug Fixes

* **di:** use Set for collectors ([9c919f6](https://github.com/ingress/ingress/commit/9c919f6d40d4d68a383d536e46fd0b7c2130c998))





# [4.0.0-beta.0](https://github.com/ingress/ingress/compare/ingress@4.0.0-alpha.0...ingress@4.0.0-beta.0) (2020-05-17)


### Bug Fixes

* error when function arity is less than two ([a1a0257](https://github.com/ingress/ingress/commit/a1a025775066efec9a286188f9d98154161f8b24))


### Features

* public api ([a77fad1](https://github.com/ingress/ingress/commit/a77fad13d62ecc39cf4c7427325d144344106af5))





# [4.0.0-alpha.0](https://github.com/ingress/ingress/compare/ingress@3.12.0...ingress@4.0.0-alpha.0) (2020-05-07)


### Features

* set 400 status code for failed parameter validation ([1436220](https://github.com/ingress/ingress/commit/14362201e69d4c59bdaab3e183b727da27599dcb))
* type as converter ([84a6a2e](https://github.com/ingress/ingress/commit/84a6a2e8ef36d283a74d23d6242f7b7ac4f14037))





# [3.12.0](https://me.github.com/ingress/ingress/compare/ingress@3.2.0...ingress@3.12.0) (2020-04-29)


### Bug Fixes

* add new default type converter ([3aa47a8](https://me.github.com/ingress/ingress/commit/3aa47a826591818cb3aa6f80c44f47675980becf))
* export BaseAuthContext as an interface ([526fe37](https://me.github.com/ingress/ingress/commit/526fe3763bdc2f528b4449a6b414ce52ec9fdad8))
* only use defaulttypeconverters if non are provided ([bf76f1c](https://me.github.com/ingress/ingress/commit/bf76f1c29c4fb40c3c9799af2d6bbd90f336ccd8))
* route-recognizer uri regex encoding ([2b803c6](https://me.github.com/ingress/ingress/commit/2b803c6b42c65b0be0310b7ba37f2f995e7e6af9))
* use statusCode property of error ([2035ab0](https://me.github.com/ingress/ingress/commit/2035ab0363f951df90ab93d63d1a768252f11bdd))


### Features

* enable async parameter resolution ([181afa1](https://me.github.com/ingress/ingress/commit/181afa125f9a0482734648b869cda488b10c0a7c))
* lazy parse url ([a442e9a](https://me.github.com/ingress/ingress/commit/a442e9a7d663554f83dd9c8f0a14a959e3646c83))
* support prioritizing middleware ([c684e96](https://me.github.com/ingress/ingress/commit/c684e96c0d97ca8b439d9e1b399b2c76fd856347))



# 3.8.0 (2020-02-20)


### Bug Fixes

* **annotation:** allow multiple methods per route annotation ([1d8cacb](https://me.github.com/ingress/ingress/commit/1d8cacb726a8b42d6a6b3a16d1e3e3e746a9ccef))



# 3.7.0 (2020-02-19)


### Bug Fixes

* better handling of falsy body values ([cf22340](https://me.github.com/ingress/ingress/commit/cf22340cc42ce7b8a7fdd7274c5c34e23ceeee1c))
* export context token type and value ([6b21a2b](https://me.github.com/ingress/ingress/commit/6b21a2bc2d423c6a9d90f441b96fd7c358360f46))
* include search in url for route ([f1107e1](https://me.github.com/ingress/ingress/commit/f1107e1f5ca7d3cc97a52e035ef6cfcf9fbd2013))





# 3.2.0 (2020-01-19)


### Bug Fixes

* don't set default host on listen ([cd4f880](https://me.github.com/ingress/ingress/commit/cd4f88098fe7acd188b99920faa7e168c5efde44))
* loosen types for fromConnect ([2e53e7e](https://me.github.com/ingress/ingress/commit/2e53e7ea53474c347c101d52ac2b9c0c4e30a9f6))


### Features

* fromConnect annotation ([24f226d](https://me.github.com/ingress/ingress/commit/24f226d9e56ea694b333ae28d689802145df7227))



# 3.0.0-next.9 (2019-12-11)


### Bug Fixes

* adjust exports for portability ([67fc635](https://me.github.com/ingress/ingress/commit/67fc6359700439637df4ed070a5497b33b1a0991))
* default value for typeconverters ([c85a996](https://me.github.com/ingress/ingress/commit/c85a9966023f1e0c1289c4b790ccc167091f83c2))
* ensure unique controller set ([9fc15f8](https://me.github.com/ingress/ingress/commit/9fc15f8b849f267b4ea274864db83af0e7718e08))
* export di ([c33edee](https://me.github.com/ingress/ingress/commit/c33edeebc62485821f354285b23b8fe5a3297556))


### Features

* add context param annotation ([fda810d](https://me.github.com/ingress/ingress/commit/fda810dd7d7643a680b444ffe0764a68811febde))
* authenticate annotation ([8aebac9](https://me.github.com/ingress/ingress/commit/8aebac9c01dece209d8a53974f28891bc424b2ae))
* ingress package ([ff0f74c](https://me.github.com/ingress/ingress/commit/ff0f74c80ac59044db0a571e2a1c88a64f62e8fd))
