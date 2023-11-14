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

import { registerService } from "../../compilerSupport/registerService.js";
import { FluencePeer } from "../../jsPeer/FluencePeer.js";
import { NodeUtils } from "../NodeUtils.js";

export function registerNodeUtils(
  peer: FluencePeer,
  serviceId: string,
  service: NodeUtils,
) {
  const anyService: Record<never, unknown> = service;

  registerService({
    peer,
    service: anyService,
    serviceId,
  });
}

// Functions
