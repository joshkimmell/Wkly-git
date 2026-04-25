interface PendoVisitor {
  id: string;
  email?: string;
  firstName?: string;
  [key: string]: unknown;
}

interface PendoAccount {
  id: string;
  businessTier?: string;
  [key: string]: unknown;
}

interface PendoOptions {
  visitor?: PendoVisitor;
  account?: PendoAccount;
  [key: string]: unknown;
}

interface Pendo {
  initialize(options: PendoOptions): void;
  identify(options: PendoOptions): void;
  track(eventName: string, properties?: Record<string, unknown>): void;
}

interface Window {
  pendo: Pendo;
}
