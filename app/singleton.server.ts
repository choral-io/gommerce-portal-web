declare global {
    // eslint-disable-next-line no-var
    var __singletons__: Record<string, unknown> | undefined;
}

export function singleton<V>(name: string, factory: () => V): V {
    global.__singletons__ ??= {};
    global.__singletons__[name] ??= factory();
    return global.__singletons__[name] as V;
}
