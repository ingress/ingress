[router-tree-map](../README.md) / [Exports](../modules.md) / Router

# Class: Router<T\>

## Type parameters

| Name |
| :------ |
| `T` |

## Table of contents

### Constructors

- [constructor](router.md#constructor)

### Properties

- [methods](router.md#methods)

### Methods

- [find](router.md#find)
- [on](router.md#on)

## Constructors

### constructor

\+ **new Router**<T\>(): [*Router*](router.md)<T\>

#### Type parameters:

| Name |
| :------ |
| `T` |

**Returns:** [*Router*](router.md)<T\>

## Properties

### methods

• **methods**: *Record*<string, [*TreeNode*](treenode.md)<T\>\>= {}

Defined in: [tree.ts:31](https://github.com/ingress/ingress/blob/43567e1/modules/router-tree-map/src/tree.ts#L31)

## Methods

### find

▸ **find**(`method`: *string*, `url`: *string*): *object*

#### Parameters:

| Name | Type |
| :------ | :------ |
| `method` | *string* |
| `url` | *string* |

**Returns:** *object*

| Name | Type |
| :------ | :------ |
| `handle` | ``null`` \| T |
| `params` | [*string*, *string*][] |

Defined in: [tree.ts:46](https://github.com/ingress/ingress/blob/43567e1/modules/router-tree-map/src/tree.ts#L46)

___

### on

▸ **on**(`method`: ``"ACL"`` \| ``"BIND"`` \| ``"CHECKOUT"`` \| ``"CONNECT"`` \| ``"COPY"`` \| ``"DELETE"`` \| ``"GET"`` \| ``"HEAD"`` \| ``"LINK"`` \| ``"LOCK"`` \| ``"M-SEARCH"`` \| ``"MERGE"`` \| ``"MKACTIVITY"`` \| ``"MKCALENDAR"`` \| ``"MKCOL"`` \| ``"MOVE"`` \| ``"NOTIFY"`` \| ``"OPTIONS"`` \| ``"PATCH"`` \| ``"POST"`` \| ``"PRI"`` \| ``"PROPFIND"`` \| ``"PROPPATCH"`` \| ``"PURGE"`` \| ``"PUT"`` \| ``"REBIND"`` \| ``"REPORT"`` \| ``"SEARCH"`` \| ``"SOURCE"`` \| ``"SUBSCRIBE"`` \| ``"TRACE"`` \| ``"UNBIND"`` \| ``"UNLINK"`` \| ``"UNLOCK"`` \| ``"UNSUBSCRIBE"``, `route`: *string*, `handler`: T): [*Router*](router.md)<T\>

#### Parameters:

| Name | Type |
| :------ | :------ |
| `method` | ``"ACL"`` \| ``"BIND"`` \| ``"CHECKOUT"`` \| ``"CONNECT"`` \| ``"COPY"`` \| ``"DELETE"`` \| ``"GET"`` \| ``"HEAD"`` \| ``"LINK"`` \| ``"LOCK"`` \| ``"M-SEARCH"`` \| ``"MERGE"`` \| ``"MKACTIVITY"`` \| ``"MKCALENDAR"`` \| ``"MKCOL"`` \| ``"MOVE"`` \| ``"NOTIFY"`` \| ``"OPTIONS"`` \| ``"PATCH"`` \| ``"POST"`` \| ``"PRI"`` \| ``"PROPFIND"`` \| ``"PROPPATCH"`` \| ``"PURGE"`` \| ``"PUT"`` \| ``"REBIND"`` \| ``"REPORT"`` \| ``"SEARCH"`` \| ``"SOURCE"`` \| ``"SUBSCRIBE"`` \| ``"TRACE"`` \| ``"UNBIND"`` \| ``"UNLINK"`` \| ``"UNLOCK"`` \| ``"UNSUBSCRIBE"`` |
| `route` | *string* |
| `handler` | T |

**Returns:** [*Router*](router.md)<T\>

Defined in: [tree.ts:32](https://github.com/ingress/ingress/blob/43567e1/modules/router-tree-map/src/tree.ts#L32)
