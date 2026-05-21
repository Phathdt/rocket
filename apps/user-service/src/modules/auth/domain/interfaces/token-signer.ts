export abstract class ITokenSigner {
  abstract sign(payload: Record<string, unknown>): string;
  abstract verify(token: string): Record<string, unknown>;
}
