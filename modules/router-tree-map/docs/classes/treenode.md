[router-tree-map](../README.md) / [Exports](../modules.md) / TreeNode

# Class: TreeNode<T\>

## Type parameters

| Name |
| :------ |
| `T` |

## Table of contents

### Constructors

- [constructor](treenode.md#constructor)

### Methods

- [get](treenode.md#get)
- [set](treenode.md#set)

## Constructors

### constructor

\+ **new TreeNode**<T\>(`path?`: *string*, `indices?`: *string*, `wildChild?`: *boolean*, `type?`: SegmentType, `priority?`: *number*, `children?`: [*TreeNode*](treenode.md)<T\>[], `handle?`: ``null`` \| T): [*TreeNode*](treenode.md)<T\>

#### Type parameters:

| Name |
| :------ |
| `T` |

#### Parameters:

| Name | Type | Default value |
| :------ | :------ | :------ |
| `path` | *string* | '' |
| `indices` | *string* | '' |
| `wildChild` | *boolean* | false |
| `type` | SegmentType | - |
| `priority` | *number* | 0 |
| `children` | [*TreeNode*](treenode.md)<T\>[] | [] |
| `handle` | ``null`` \| T | null |

**Returns:** [*TreeNode*](treenode.md)<T\>

Defined in: [tree.ts:52](https://github.com/ingress/ingress/blob/43567e1/modules/router-tree-map/src/tree.ts#L52)

## Methods

### get

▸ **get**(`path`: *string*): *object*

Returns the handle registered with the given path. Any found parameters
are added to an array of entries
suitable for `Object.fromEntries` or a `Map` constructor

#### Parameters:

| Name | Type |
| :------ | :------ |
| `path` | *string* |

**Returns:** *object*

| Name | Type |
| :------ | :------ |
| `handle` | ``null`` \| T |
| `params` | [*string*, *string*][] |

Defined in: [tree.ts:200](https://github.com/ingress/ingress/blob/43567e1/modules/router-tree-map/src/tree.ts#L200)

___

### set

▸ **set**(`path`: *string*, `handle`: T): [*TreeNode*](treenode.md)<T\>

adds a node with the given handle to the path.

#### Parameters:

| Name | Type |
| :------ | :------ |
| `path` | *string* |
| `handle` | T |

**Returns:** [*TreeNode*](treenode.md)<T\>

Defined in: [tree.ts:79](https://github.com/ingress/ingress/blob/43567e1/modules/router-tree-map/src/tree.ts#L79)
