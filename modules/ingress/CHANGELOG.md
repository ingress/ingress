# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
