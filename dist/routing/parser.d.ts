export interface ParsedRoute {
    path: string;
    method: string;
    handler: Function;
    request?: any;
    response?: any;
}
export interface RouteParser {
    parseRouteFile(filePath: string): Promise<ParsedRoute[]>;
}
export declare const createRouteParser: () => RouteParser;
//# sourceMappingURL=parser.d.ts.map