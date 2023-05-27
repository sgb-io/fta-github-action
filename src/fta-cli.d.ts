declare module "fta-cli" {
  export interface FtaOptions {
    json?: boolean;
  }

  export function runFta(path: string, FtaOptions);
}
