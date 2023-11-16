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

import type {
  FunctionCallDef,
  JSONValue,
  SimpleTypes,
  ArrowWithoutCallbacks,
  ServiceDef,
} from "@fluencelabs/interfaces";

import { CallAquaFunctionConfig } from "./compilerSupport/callFunction.js";
import {
  aqua2ts,
  ts2aqua,
  wrapFunction,
} from "./compilerSupport/conversions.js";
import { ServiceImpl } from "./compilerSupport/types.js";
import { FluencePeer } from "./jsPeer/FluencePeer.js";

import { callAquaFunction, Fluence, registerService } from "./index.js";

const isAquaConfig = (
  config: JSONValue | ServiceImpl[string] | undefined,
): config is CallAquaFunctionConfig => {
  return (
    typeof config === "object" &&
    config !== null &&
    !Array.isArray(config) &&
    ["undefined", "number"].includes(typeof config["ttl"])
  );
};

/**
 * Convenience function to support Aqua `func` generation backend
 * The compiler only need to generate a call the function and provide the corresponding definitions and the air script
 *
 * @param args - raw arguments passed by user to the generated function
 * @param def - function definition generated by the Aqua compiler
 * @param script - air script with function execution logic generated by the Aqua compiler
 */
export const v5_callFunction = async (
  args: (JSONValue | ServiceImpl[string])[],
  def: FunctionCallDef,
  script: string,
): Promise<unknown> => {
  const argNames = Object.keys(def.arrow);
  const schemaArgCount = argNames.length;

  type FunctionArg = SimpleTypes | ArrowWithoutCallbacks;

  const schemaFunctionArgs: Record<string, FunctionArg> =
    def.arrow.domain.tag === "nil" ? {} : def.arrow.domain.fields;

  let peer: FluencePeer | undefined;

  if (args[0] instanceof FluencePeer) {
    peer = args[0];
    args = args.slice(1);
  } else {
    peer = Fluence.defaultClient;
  }

  if (peer == null) {
    throw new Error(
      "Could not register Aqua service because the client is not initialized. Did you forget to call Fluence.connect()?",
    );
  }

  // if args more than expected in schema (schemaArgCount) then last arg is config
  const config = schemaArgCount < args.length ? args.pop() : undefined;

  if (!isAquaConfig(config)) {
    throw new Error("Config should be object type");
  }

  const callArgs = Object.fromEntries<JSONValue | ServiceImpl[string]>(
    args.slice(0, schemaArgCount).map((arg, i) => {
      const argSchema = schemaFunctionArgs[argNames[i]];

      if (argSchema.tag === "arrow") {
        if (typeof arg !== "function") {
          throw new Error("Argument and schema don't match");
        }

        const wrappedFunction = wrapFunction(arg, argSchema);

        return [argNames[i], wrappedFunction];
      }

      if (typeof arg === "function") {
        throw new Error("Argument and schema don't match");
      }

      return [argNames[i], ts2aqua(arg, argSchema)];
    }),
  );

  const returnTypeVoid =
    def.arrow.codomain.tag === "nil" || def.arrow.codomain.items.length === 0;

  const params = {
    peer,
    args: callArgs,
    config,
  };

  const result = await callAquaFunction({
    script,
    ...params,
    fireAndForget: returnTypeVoid,
  });

  const returnSchema =
    def.arrow.codomain.tag === "unlabeledProduct" &&
    def.arrow.codomain.items.length === 1
      ? def.arrow.codomain.items[0]
      : def.arrow.codomain;

  return aqua2ts(result, returnSchema);
};

/**
 * Convenience function to support Aqua `service` generation backend
 * The compiler only need to generate a call the function and provide the corresponding definitions and the air script
 * @param args - raw arguments passed by user to the generated function
 * @param def - service definition generated by the Aqua compiler
 */
export const v5_registerService = (args: unknown[], def: ServiceDef): void => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const serviceImpl = args.pop() as ServiceImpl;
  let peer: FluencePeer | undefined;
  let serviceId = def.defaultServiceId;

  if (args[0] instanceof FluencePeer) {
    peer = args[0];
    args = args.slice(1);
  } else {
    peer = Fluence.defaultClient;
  }

  if (peer == null) {
    throw new Error(
      "Could not register Aqua service because the client is not initialized. Did you forget to call Fluence.connect()?",
    );
  }

  if (args.length === 2) {
    if (typeof args[0] !== "string") {
      throw new Error(
        `Service ID should be of type string. ${typeof args[0]} provided.`,
      );
    }

    serviceId = args[0];
  }

  if (serviceId == null) {
    throw new Error("Service ID is not provided");
  }

  // Schema for every function in service
  const serviceSchema = def.functions.tag === "nil" ? {} : def.functions.fields;

  // Wrapping service impl to convert their args ts -> aqua and backwards
  const wrappedServiceImpl = Object.fromEntries(
    Object.entries(serviceImpl).map(([name, func]) => {
      return [name, wrapFunction(func, serviceSchema[name])];
    }),
  );

  registerService({
    service: wrappedServiceImpl,
    peer,
    serviceId,
  });
};
