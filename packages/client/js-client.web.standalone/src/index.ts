import { FluencePeer } from '@fluencelabs/js-peer/dist/js-peer/FluencePeer.js';
import { MarineBasedAvmRunner } from '@fluencelabs/js-peer/dist/js-peer/avm.js';
import { MarineBackgroundRunner } from '@fluencelabs/js-peer/dist/marine/worker';
import { checkConnection, marineLogFunction } from '@fluencelabs/js-peer/dist/js-peer/utils.js';
import { InlinedWorkerLoader, InlinedWasmLoader } from '@fluencelabs/js-peer/dist/marine/deps-loader/common.js';

export const makeDefaultPeer = () => {
    const workerLoader = new InlinedWorkerLoader('___worker___');
    const controlModuleLoader = new InlinedWasmLoader('___marine___');
    const avmModuleLoader = new InlinedWasmLoader('___avm___');

    const marine = new MarineBackgroundRunner(workerLoader, controlModuleLoader, marineLogFunction);
    const avm = new MarineBasedAvmRunner(marine, avmModuleLoader, undefined);
    return new FluencePeer(marine, avm);
};

// @ts-ignore
globalThis.defaultPeer = makeDefaultPeer();
