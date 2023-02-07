import { SecurityTetraplet } from '@fluencelabs/avm';
import type { MultiaddrInput } from '@multiformats/multiaddr';
import { FnConfig, FunctionCallDef, ServiceDef } from './compilerSupport.js';
export * from './compilerSupport.js';

/**
 * Peer ID's id as a base58 string (multihash/CIDv0).
 */
export type PeerIdB58 = string;

/**
 * Additional information about a service call
 * @typeparam ArgName
 */
export interface CallParams<ArgName extends string | null> {
    /**
     * The identifier of particle which triggered the call
     */
    particleId: string;

    /**
     * The peer id which created the particle
     */
    initPeerId: PeerIdB58;

    /**
     * Particle's timestamp when it was created
     */
    timestamp: number;

    /**
     * Time to live in milliseconds. The time after the particle should be expired
     */
    ttl: number;

    /**
     * Particle's signature
     */
    signature?: string;

    /**
     * Security tetraplets
     */
    tetraplets: ArgName extends string ? Record<ArgName, SecurityTetraplet[]> : Record<string, never>;
}

/**
 * Node of the Fluence network specified as a pair of node's multiaddr and it's peer id
 */
type Node = {
    peerId: PeerIdB58;
    multiaddr: string;
};

export type ConnectionOption = string | MultiaddrInput | Node;

/**
 * Configuration used when initiating Fluence Peer
 */
export interface PeerConfig {
    /**
     * Node in Fluence network to connect to.
     * Can be in the form of:
     * - string: multiaddr in string format
     * - Multiaddr: multiaddr object, @see https://github.com/multiformats/js-multiaddr
     * - Node: node structure, @see Node
     * - Implementation of FluenceConnection class, @see FluenceConnection
     * If not specified the will work locally and would not be able to send or receive particles.
     */
    connectTo?: ConnectionOption;

    /**
     * @deprecated. AVM run through marine-js infrastructure.
     * @see debug.marineLogLevel option to configure logging level of AVM
     */
    // avmLogLevel?: LogLevel | 'off';

    /**
     * Specify the KeyPair to be used to identify the Fluence Peer.
     * Will be generated randomly if not specified
     */
    //KeyPair?: KeyPair;

    /**
     * When the peer established the connection to the network it sends a ping-like message to check if it works correctly.
     * The options allows to specify the timeout for that message in milliseconds.
     * If not specified the default timeout will be used
     */
    checkConnectionTimeoutMs?: number;

    /**
     * When the peer established the connection to the network it sends a ping-like message to check if it works correctly.
     * If set to true, the ping-like message will be skipped
     * Default: false
     */
    skipCheckConnection?: boolean;

    /**
     * The dialing timeout in milliseconds
     */
    dialTimeoutMs?: number;

    /**
     * Sets the default TTL for all particles originating from the peer with no TTL specified.
     * If the originating particle's TTL is defined then that value will be used
     * If the option is not set default TTL will be 7000
     */
    defaultTtlMs?: number;

    /**
     * This option allows to specify the location of various dependencies needed for marine-js.
     * Each key specifies the location of the corresponding dependency.
     * If Fluence peer is started inside browser the location is treated as the path to the file relative to origin.
     * IF Fluence peer is started in nodejs the location is treated as the full path to file on the file system.
     */
    // marineJS?: {
    //     /**
    //      * Configures path to the marine-js worker script.
    //      */
    //     workerScriptPath: string;

    //     /**
    //      * Configures the path to marine-js control wasm module
    //      */
    //     marineWasmPath: string;

    //     /**
    //      * Configures the path to AVM wasm module
    //      */
    //     avmWasmPath: string;
    // };

    /**
     * Enables\disabled various debugging features
     */
    // debug?: {
    //     /**
    //      * If set to true, newly initiated particle ids will be printed to console.
    //      * Useful to see what particle id is responsible for aqua function
    //      */
    //     printParticleId?: boolean;

    //     /**
    //      * Log level for marine services. By default logging is turned off.
    //      */
    //     marineLogLevel?: LogLevel;
    // };
}

/**
 * Information about Fluence Peer connection.
 * Represented as object with the following keys:
 * - `isInitialized`: Is the peer initialized or not.
 * - `peerId`: Peer Id of the peer. Null if the peer is not initialized
 * - `isConnected`: Is the peer connected to network or not
 * - `relayPeerId`: Peer Id of the relay the peer is connected to. If the connection is direct relayPeerId is null
 * - `isDirect`: True if the peer is connected to the network directly (not through relay)
 */
export type PeerStatus =
    | {
          isInitialized: false;
          peerId: null;
          isConnected: false;
          relayPeerId: null;
      }
    | {
          isInitialized: true;
          peerId: PeerIdB58;
          isConnected: false;
          relayPeerId: null;
      }
    | {
          isInitialized: true;
          peerId: PeerIdB58;
          isConnected: true;
          relayPeerId: PeerIdB58;
      }
    | {
          isInitialized: true;
          peerId: PeerIdB58;
          isConnected: true;
          isDirect: true;
          relayPeerId: null;
      };

export interface IFluencePeer {
    start(config?: PeerConfig): Promise<void>;
    stop(): Promise<void>;
    getStatus(): PeerStatus;

    // TODO: come up with a working interface for
    // - particle creation
    // - particle initialization
    // - service registration
    internals: any;
    compilerSupport: {
        callFunction: (args: CallFunctionArgs) => Promise<unknown>;
        registerService: (args: RegisterServiceArgs) => void;
    };
}

export interface CallFunctionArgs {
    def: FunctionCallDef;
    script: string;
    config: FnConfig;
    args: { [key: string]: any };
}

export interface RegisterServiceArgs {
    def: ServiceDef;
    serviceId: string | undefined;
    service: any;
}

export const asFluencePeer = (fluencePeerCandidate: unknown): IFluencePeer => {
    if (isFluencePeer(fluencePeerCandidate)) {
        return fluencePeerCandidate;
    }

    throw new Error('');
};

export const isFluencePeer = (fluencePeerCandidate: unknown): fluencePeerCandidate is IFluencePeer => {
    if (fluencePeerCandidate && (fluencePeerCandidate as any).__isFluenceAwesome) {
        return true;
    }

    return false;
};
