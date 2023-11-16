/**
 * Copyright 2023 Fluence Labs Limited
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

import { JSONValue } from "@fluencelabs/interfaces";

import { FluencePeer } from "../jsPeer/FluencePeer.js";
import { logger } from "../util/logger.js";
import { ArgCallbackFunction } from "../util/testUtils.js";

import {
  errorHandlingService,
  injectRelayService,
  injectValueService,
  registerParticleScopeService,
  responseService,
  ServiceDescription,
  userHandlerService,
} from "./services.js";

const log = logger("aqua");

/**
 * Convenience function which does all the internal work of creating particles
 * and making necessary service registrations in order to support Aqua function calls
 *
 * @param def - function definition generated by the Aqua compiler
 * @param script - air script with function execution logic generated by the Aqua compiler
 * @param config - options to configure Aqua function execution
 * @param peer - Fluence Peer to invoke the function at
 * @param args - args in the form of JSON where each key corresponds to the name of the argument
 * @returns
 */

export type CallAquaFunctionArgs = {
  script: string;
  config: CallAquaFunctionConfig | undefined;
  peer: FluencePeer;
  args: { [key: string]: JSONValue | ArgCallbackFunction };
  fireAndForget?: boolean | undefined;
};

export type CallAquaFunctionConfig = {
  ttl?: number;
};

export const callAquaFunction = async ({
  script,
  config = {},
  peer,
  args,
  // TODO: remove after LNG-286 is done
  fireAndForget = false,
}: CallAquaFunctionArgs) => {
  log.trace("calling aqua function %j", { script, config, args });

  const particle = await peer.internals.createNewParticle(script, config.ttl);

  return new Promise<JSONValue>((resolve, reject) => {
    for (const [name, argVal] of Object.entries(args)) {
      let service: ServiceDescription;

      if (typeof argVal === "function") {
        service = userHandlerService("callbackSrv", name, argVal);
      } else {
        service = injectValueService("getDataSrv", name, argVal);
      }

      registerParticleScopeService(peer, particle, service);
    }

    if (!fireAndForget) {
      registerParticleScopeService(peer, particle, responseService(resolve));
    }

    registerParticleScopeService(peer, particle, injectRelayService(peer));

    registerParticleScopeService(peer, particle, errorHandlingService(reject));
    // If function is void, then it's completed when one of the two conditions is met:
    //  1. The particle is sent to the network (state 'sent')
    //  2. All CallRequests are executed, e.g., all variable loading and local function calls are completed (state 'localWorkDone')

    peer.internals.initiateParticle(particle, resolve, reject);
  });
};
