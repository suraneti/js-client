/*
 * Copyright 2020 Fluence Labs Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { FluenceConnection, ParticleHandler, PeerIdB58 } from '@fluencelabs/interfaces';
import { WebSockets } from '@libp2p/websockets';
import { Mplex } from '@libp2p/mplex';
import { Libp2p, createLibp2p } from 'libp2p';
import { decode, encode } from 'it-length-prefixed';
import { pipe } from 'it-pipe';
import * as log from 'loglevel';
import { Noise } from '@chainsafe/libp2p-noise';
import type { PeerId } from '@libp2p/interface-peer-id';
import type { MultiaddrInput } from '@multiformats/multiaddr';
import { Multiaddr } from '@multiformats/multiaddr';
import { Connection } from '@libp2p/interface-connection';

export { Multiaddr } from '@multiformats/multiaddr';
import Buffer from './Buffer';

export const PROTOCOL_NAME = '/fluence/particle/2.0.0';

/**
 * Options to configure fluence connection
 */
export interface FluenceConnectionOptions {
    /**
     * Peer id of the Fluence Peer
     */
    peerId: PeerId;

    /**
     * Multiaddress of the relay to make connection to
     */
    relayAddress: MultiaddrInput;

    /**
     * The dialing timeout in milliseconds
     */
    dialTimeoutMs?: number;
}

/**
 * Implementation for JS peers which connects to Fluence through relay node
 */
export class RelayConnection extends FluenceConnection {
    constructor(
        public peerId: PeerIdB58,
        private _lib2p2Peer: Libp2p,
        private _relayAddress: Multiaddr,
        public readonly relayPeerId: PeerIdB58,
    ) {
        super();
    }

    private _connection?: Connection;

    static async createConnection(options: FluenceConnectionOptions): Promise<RelayConnection> {
        const lib2p2Peer = await createLibp2p({
            peerId: options.peerId,
            transports: [new WebSockets()],
            // @ts-ignore
            streamMuxers: [new Mplex()],
            // @ts-ignore
            connectionEncryption: [new Noise()],
            connectionManager: {
                dialTimeout: options?.dialTimeoutMs,
            },
        });

        const relayMultiaddr = new Multiaddr(options.relayAddress);
        const relayPeerId = relayMultiaddr.toString();
        if (relayPeerId === null) {
            throw new Error('Specified multiaddr is invalid or missing peer id: ' + options.relayAddress);
        }

        return new RelayConnection(
            // force new line
            options.peerId.toString(),
            lib2p2Peer,
            relayMultiaddr,
            relayPeerId,
        );
    }

    async sendParticle(nextPeerIds: PeerIdB58[], particle: string): Promise<void> {
        if (nextPeerIds.length !== 1 && nextPeerIds[0] !== this.relayPeerId) {
            throw new Error(
                `Relay connection only accepts peer id of the connected relay. Got: ${JSON.stringify(
                    nextPeerIds,
                )} instead.`,
            );
        }

        /*
        TODO:: find out why this doesn't work and a new connection has to be established each time
        if (this._connection.streams.length !== 1) {
            throw new Error('Incorrect number of streams in FluenceConnection');
        }

        const sink = this._connection.streams[0].sink;
        */

        const stream = await this._lib2p2Peer.dialProtocol(this._relayAddress, PROTOCOL_NAME);
        // @ts-ignore
        const sink = stream.sink;

        pipe(
            // force new line
            [Buffer.from(particle, 'utf8')],
            encode(),
            sink,
        );
    }

    async connect(onIncomingParticle: ParticleHandler) {
        // @ts-ignore
        await this._lib2p2Peer.start();

        this._lib2p2Peer.handle([PROTOCOL_NAME], async ({ connection, stream }) => {
            pipe(
                stream.source,
                // @ts-ignore
                decode(),
                async (source: AsyncIterable<string>) => {
                    try {
                        for await (const msg of source) {
                            try {
                                onIncomingParticle(msg);
                            } catch (e) {
                                log.error('error on handling a new incoming message: ' + e);
                            }
                        }
                    } catch (e) {
                        log.debug('connection closed: ' + e);
                    }
                },
            );
        });

        log.debug(`dialing to the node with client's address: ` + this._lib2p2Peer.peerId.toString());

        try {
            // @ts-ignore
            this._connection = await this._lib2p2Peer.dial(this._relayAddress);
        } catch (e: any) {
            if (e.name === 'AggregateError' && e._errors?.length === 1) {
                const error = e._errors[0];
                throw new Error(`Error dialing node ${this._relayAddress}:\n${error.code}\n${error.message}`);
            } else {
                throw e;
            }
        }
    }

    async disconnect(): Promise<void> {}
}
