/**
 *
 * This file is auto-generated. Do not edit manually: changes may be erased.
 * Generated by Aqua compiler: https://github.com/fluencelabs/aqua/.
 * If you find any bugs, please write an issue on GitHub: https://github.com/fluencelabs/aqua/issues
 * Aqua version: 0.7.7-362
 *
 */
import { FluencePeer } from '../..';
import type { CallParams$$ } from '../../internal/compilerSupport/v4';
import { registerService$$ } from '../../internal/compilerSupport/v4';

// Services

export interface SigDef {
    get_peer_id: (callParams: CallParams$$<null>) => string | Promise<string>;
    sign: (
        data: number[],
        callParams: CallParams$$<'data'>,
    ) =>
        | { error: string | null; signature: number[] | null; success: boolean }
        | Promise<{ error: string | null; signature: number[] | null; success: boolean }>;
    verify: (
        signature: number[],
        data: number[],
        callParams: CallParams$$<'signature' | 'data'>,
    ) => boolean | Promise<boolean>;
}
export function registerSig(service: SigDef): void;
export function registerSig(serviceId: string, service: SigDef): void;
export function registerSig(peer: FluencePeer, service: SigDef): void;
export function registerSig(peer: FluencePeer, serviceId: string, service: SigDef): void;

export function registerSig(...args: any) {
    registerService$$(args, {
        defaultServiceId: 'sig',
        functions: {
            tag: 'labeledProduct',
            fields: {
                get_peer_id: {
                    tag: 'arrow',
                    domain: {
                        tag: 'nil',
                    },
                    codomain: {
                        tag: 'unlabeledProduct',
                        items: [
                            {
                                tag: 'scalar',
                                name: 'string',
                            },
                        ],
                    },
                },
                sign: {
                    tag: 'arrow',
                    domain: {
                        tag: 'labeledProduct',
                        fields: {
                            data: {
                                tag: 'array',
                                type: {
                                    tag: 'scalar',
                                    name: 'u8',
                                },
                            },
                        },
                    },
                    codomain: {
                        tag: 'unlabeledProduct',
                        items: [
                            {
                                tag: 'struct',
                                name: 'SignResult',
                                fields: {
                                    error: {
                                        tag: 'option',
                                        type: {
                                            tag: 'scalar',
                                            name: 'string',
                                        },
                                    },
                                    signature: {
                                        tag: 'option',
                                        type: {
                                            tag: 'array',
                                            type: {
                                                tag: 'scalar',
                                                name: 'u8',
                                            },
                                        },
                                    },
                                    success: {
                                        tag: 'scalar',
                                        name: 'bool',
                                    },
                                },
                            },
                        ],
                    },
                },
                verify: {
                    tag: 'arrow',
                    domain: {
                        tag: 'labeledProduct',
                        fields: {
                            signature: {
                                tag: 'array',
                                type: {
                                    tag: 'scalar',
                                    name: 'u8',
                                },
                            },
                            data: {
                                tag: 'array',
                                type: {
                                    tag: 'scalar',
                                    name: 'u8',
                                },
                            },
                        },
                    },
                    codomain: {
                        tag: 'unlabeledProduct',
                        items: [
                            {
                                tag: 'scalar',
                                name: 'bool',
                            },
                        ],
                    },
                },
            },
        },
    });
}

// Functions
