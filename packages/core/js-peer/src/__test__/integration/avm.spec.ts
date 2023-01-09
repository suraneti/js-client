import { handleTimeout } from '../../utils';
import { registerHandlersHelper, withPeer } from '../util';

describe('Avm spec', () => {
    it('Simple call', async () => {
        await withPeer(async (peer) => {
            const res = await new Promise<string[]>((resolve, reject) => {
                const script = `
                (call %init_peer_id% ("print" "print") ["1"])
            `;
                const particle = peer.internals.createNewParticle(script);

                if (particle instanceof Error) {
                    return reject(particle.message);
                }

                registerHandlersHelper(peer, particle, {
                    print: {
                        print: (args: Array<Array<string>>) => {
                            const [res] = args;
                            resolve(res);
                        },
                    },
                });

                peer.internals.initiateParticle(particle, handleTimeout(reject));
            });

            expect(res).toBe('1');
        });
    });

    it('Par call', async () => {
        await withPeer(async (peer) => {
            const res = await new Promise<string[]>((resolve, reject) => {
                const res: any[] = [];
                const script = `
                (seq
                    (par
                        (call %init_peer_id% ("print" "print") ["1"])
                        (null)
                    )
                    (call %init_peer_id% ("print" "print") ["2"])
                )
            `;
                const particle = peer.internals.createNewParticle(script);

                if (particle instanceof Error) {
                    return reject(particle.message);
                }

                registerHandlersHelper(peer, particle, {
                    print: {
                        print: (args: any) => {
                            res.push(args[0]);
                            if (res.length == 2) {
                                resolve(res);
                            }
                        },
                    },
                });

                peer.internals.initiateParticle(particle, handleTimeout(reject));
            });

            expect(res).toStrictEqual(['1', '2']);
        });
    });

    it('Timeout in par call: race', async () => {
        await withPeer(async (peer) => {
            const res = await new Promise((resolve, reject) => {
                const script = `
                (seq
                    (call %init_peer_id% ("op" "identity") ["slow_result"] arg) 
                    (seq
                        (par
                            (call %init_peer_id% ("peer" "timeout") [1000 arg] $result)
                            (call %init_peer_id% ("op" "identity") ["fast_result"] $result)
                        )
                        (seq
                            (canon %init_peer_id% $result #result)
                            (call %init_peer_id% ("return" "return") [#result.$[0]]) 
                        )
                    )
                )
            `;
                const particle = peer.internals.createNewParticle(script);

                if (particle instanceof Error) {
                    return reject(particle.message);
                }

                registerHandlersHelper(peer, particle, {
                    return: {
                        return: (args: any) => {
                            resolve(args[0]);
                        },
                    },
                });

                peer.internals.initiateParticle(particle, handleTimeout(reject));
            });

            expect(res).toBe('fast_result');
        });
    });

    it('Timeout in par call: wait', async () => {
        await withPeer(async (peer) => {
            const res = await new Promise((resolve, reject) => {
                const script = `
                (seq
                    (call %init_peer_id% ("op" "identity") ["timeout_msg"] arg) 
                    (seq
                        (seq
                            (par
                                (call %init_peer_id% ("peer" "timeout") [1000 arg] $ok_or_err)
                                (call "invalid_peer" ("op" "identity") ["never"] $ok_or_err) 
                            )
                            (xor
                                (seq
                                    (canon %init_peer_id% $ok_or_err #ok_or_err)
                                    (match #ok_or_err.$[0] "timeout_msg"
                                        (ap "failed_with_timeout" $result)
                                    )
                                )
                                (ap "impossible happened" $result)
                            )
                        )
                        (seq
                            (canon %init_peer_id% $result #result)
                            (call %init_peer_id% ("return" "return") [#result.$[0]]) 
                        )
                    )
                )
            `;
                const particle = peer.internals.createNewParticle(script);

                if (particle instanceof Error) {
                    return reject(particle.message);
                }

                registerHandlersHelper(peer, particle, {
                    return: {
                        return: (args: any) => {
                            resolve(args[0]);
                        },
                    },
                });

                peer.internals.initiateParticle(particle, handleTimeout(reject));
            });

            expect(res).toBe('failed_with_timeout');
        });
    });
});
