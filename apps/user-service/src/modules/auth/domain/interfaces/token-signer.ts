export abstract class ITokenSigner {
  abstract sign(payload: Record<string, unknown>): string;
}
