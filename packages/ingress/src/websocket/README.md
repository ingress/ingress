## Ingress Websockets

Ingress Websocket constructs:

## Namespace
 - All messages flow through a namespace, which is responsible for serialization and management of multiple channels, For example, an endpoint would assign a unique namespace for websocket connections accepted at that endpoint

## Channel
 - A group of one or more websockets that are addressable by name
 - Within a namespace you can send a message to one or many channels

## Backchannel
 - A backchannel follows an RxJs Subject interface. Such that, when provided, all messages will be communicated via the backchannel. For example, a server cluster spreads equally all of the incoming websocket connections across its nodes, the backchannel can be used to communicate messages that need to access those connections on other nodes.
