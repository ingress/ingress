/* eslint-disable @typescript-eslint/no-unused-vars */
import ingress, { IngressApp, Context } from '../app'
import { Route } from '../router/route.annotation'
import WebSocket from 'ws'
import { getAsync, postAsync, getPort } from '../router/test.util.spec'
import { UpgradeBody } from '../websocket/upgrade'
import { Namespace } from './namespace'

type ActionMessage<T = Record<string, unknown>> = { action: string } & T
type EventMessage<T = Record<string, unknown>> = { event: string } & T
function isEvent<T = Record<string, unknown>>(x: any): x is EventMessage<T> {
  return Boolean(x.event)
}
function isAction<T = Record<string, unknown>>(x: any): x is ActionMessage<T> {
  return Boolean(x.action)
}

describe('Websocket Connections', () => {
  let app: IngressApp, path: (url: string, protocol?: string) => string

  beforeEach(async () => {
    app = ingress()
    const { Controller, SingletonService } = app

    @SingletonService
    class Websockets {
      group = new Namespace('group')
      constructor() {
        this.group.start()
        this.group.onMessage.subscribe((x) => {
          if (isAction<{ channel: string }>(x.message) && x.message.action === 'join') {
            this.group.addToChannel(x.message.channel, x.connection)
            this.group.send({
              message: { event: 'joined', channel: x.message.channel },
              channels: [x.connection.id],
            })
          } else {
            this.group.send({ message: x.message, channels: [x.connection.id] })
          }
        })
      }
    }
    @Controller
    class WebsocketController {
      constructor(private ws: Websockets) {}

      @Route.Post('/:channel')
      sendMessageToChannel(@Route.Path('channel') channel: string, @Route.Body() message: any) {
        this.ws.group.send({ message, channels: [channel] })
      }

      @Route.Upgrade('websocket')
      async handleUpgrade(context: Context, @Route.Body() body: UpgradeBody) {
        const socket = await body.accept()
        this.ws.group.createConnection(context.id, socket, { context })
        this.ws.group.send({
          message: { event: 'connected', id: context.id },
          channels: [context.id],
        })
      }
    }
    const portInfo = await getPort()
    await app.listen(+portInfo.port)
    path = portInfo.path
  })

  afterEach(() => app.close())

  function expectMessages(
    { client, closeAfter }: { client: WebSocket; closeAfter?: boolean },
    messages: any[]
  ) {
    let count = 0
    client.on('message', (message) => {
      const msg = JSON.parse(message.toString())
      expect(msg).toMatchObject(messages[count++])
      if (count === messages.length && closeAfter) {
        client.close()
      }
    })
  }
  function whenClosed(client: WebSocket) {
    return new Promise((resolve, reject) => client.once('error', reject).once('close', resolve))
  }

  it('should send and receive messages', () => {
    const client = new WebSocket(path('/websocket', 'ws')),
      expectedMessage = { test: Math.random().toString() }
    client.once('open', () => client.send(JSON.stringify(expectedMessage)))
    expectMessages({ client, closeAfter: true }, [{ event: 'connected' }, expectedMessage])
    return whenClosed(client)
  })

  it('should receive channeled messages', async () => {
    const client = new WebSocket(path('/websocket', 'ws')),
      channel = Math.random().toString(),
      expectedMessage = { hello: Math.random().toString() }

    client.once('open', () => {
      client.send(JSON.stringify({ action: 'join', channel }))
      postAsync(path(`/${channel}`), { data: expectedMessage })
    })
    expectMessages({ client, closeAfter: true }, [
      { event: 'connected' },
      { event: 'joined', channel },
      expectedMessage,
    ])
    return whenClosed(client)
  })

  it('should not send messages to sockets outside of the designated channel', async () => {
    const client = new WebSocket(path('/websocket', 'ws')),
      client2 = new WebSocket(path('/websocket', 'ws')),
      channel = Math.random().toString(),
      expectedMessage = { hello: Math.random().toString() }
    let count = 0
    client.once('open', async () => {
      client.send(JSON.stringify({ action: 'join', channel }))
      await postAsync(path(`/${channel}`), { data: expectedMessage })
      await postAsync(path(`/${channel}`), { data: expectedMessage })
    })

    expectMessages({ client, closeAfter: true }, [
      { event: 'connected' },
      {
        event: 'joined',
        channel,
      },
      expectedMessage,
      expectedMessage,
    ])
    client2.on('message', () => {
      count++
    })
    await whenClosed(client)
    client2.close()
    await whenClosed(client2)
    expect(count).toEqual(1)
  })
})
