export interface RouteLoader {
    loadRoutes(directory: string, pattern: RegExp): Promise<string[]>;
}
export declare const createFileRouteLoader: () => RouteLoader;
//# sourceMappingURL=loader.d.ts.map