declare global {
    var __singletons__: {
        [name: string]: unknown
    };
}

export function singleton<V>(name: string, factory: () => V): V {
    global.__singletons__ ??= {};
    global.__singletons__[name] ??= factory();
    return global.__singletons__[name] as V;
}
