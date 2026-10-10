export declare const propagationLabels: Readonly<{ emits: "emits"; enters: "enters"; propagatesThrough: "propagates through"; reaches: "reaches" }>;
export declare function normalizePropagationLabels<T>(candidate: T): T;
export declare function propagationRoles(candidate: { mode: string; objects: readonly { id: string }[]; connections: readonly { kind?: string; from: string; to: string; label: string }[] }): { source: string; medium: string; payload: string; destination: string } | null;
