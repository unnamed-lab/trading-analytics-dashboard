/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  address,
  getAddressEncoder,
  getProgramDerivedAddress,
} from "@solana/kit";
import * as base64Arraybuffer from "base64-arraybuffer";

// Token metadata from the Deriverse logs
const TOKEN_METADATA: Record<
  number,
  { symbol: string; name: string; decimals: number; mint: string }
> = {
  [-1]: {
    symbol: "SOL",
    name: "SOL",
    decimals: 9,
    mint: "So11111111111111111111111111111111111111112",
  },
  0: {
    symbol: "DRVS",
    name: "DRVS",
    decimals: 8,
    mint: "DrvrseYYQQY9xQ9kKLGKt5p47L1oZ8bbZkvGir1pvLGh",
  },
  1: {
    symbol: "USDC",
    name: "USDC",
    decimals: 6,
    mint: "A2Pz6rVyXuadFkKnhMXd1w9xgSrZd8m8sEGpuGuyFhaj",
  },
  2: {
    symbol: "SOL",
    name: "SOL",
    decimals: 9,
    mint: "9pan9bMn5HatX4EJdBwg9VgCa7Uz5HL8N1m5D3NdXejP",
  },
  4: {
    symbol: "LETTERA",
    name: "LETTERA",
    decimals: 5,
    mint: "61TgrMLJCgwUzhDxXQzQEmFaVTWE87nfURfiuRAbhvrd",
  },
  6: {
    symbol: "VELIT",
    name: "VELIT",
    decimals: 6,
    mint: "45ZUE8YdUh9CWiPbDqZ2exGDREn6vdJwHv4q1FUaJWno",
  },
  8: {
    symbol: "SUN",
    name: "SUN",
    decimals: 4,
    mint: "7b3swp3mYbRtYGSe6s8VLKqmci1ZrHA72aDKa373Uxhp",
  },
  10: {
    symbol: "BRSH",
    name: "BRSH",
    decimals: 6,
    mint: "9AHT6ueMnTeuSS6iCkMpMNL2MryZmnnE3fSpvi9uGo8P",
  },
  12: {
    symbol: "MSHK",
    name: "MSHK",
    decimals: 4,
    mint: "5pxYjbkguz8Uj6U1wwqbNRzRcStMy3AaEF8YkfHorpr3",
  },
  14: {
    symbol: "SOL",
    name: "SOL",
    decimals: 6,
    mint: "79eqWyD3YXgCqKhcWfhGf8fuS5RU9xkvCESxDVYu8nDs",
  },
  16: {
    symbol: "trs",
    name: "trs",
    decimals: 6,
    mint: "EvTvBAqP9sLRPXCsK6CVjuvCcjc7HSz89wx3oDzpjuhj",
  },
  18: {
    symbol: "sad",
    name: "sad",
    decimals: 6,
    mint: "B55xpWvkWY2tyjRZGQ9USjnfroBbfKMka9s3cyaDAYKZ",
  },
  20: {
    symbol: "MDVD",
    name: "MDVD",
    decimals: 9,
    mint: "3pLtzULvvU7fgBdnRMrUQ8tNdNkwWcxKRZt2BZcNGUrb",
  },
  22: {
    symbol: "333",
    name: "333",
    decimals: 9,
    mint: "31Hj1HQq6u4FxWrLQosx6qkLqSZmydadrkrLfrrDS46F",
  },
  24: {
    symbol: "BRSH",
    name: "BRSH",
    decimals: 4,
    mint: "AsuPodMSv5RfUbYSk5mNmeaWvm74Dz9PhUWpTyibCE1k",
  },
  26: {
    symbol: "1",
    name: "1",
    decimals: 6,
    mint: "2drZ43aXUgyynjkxKjsTtMPeaf1Zabruer7sb7p2Qsea",
  },
  28: {
    symbol: "TST",
    name: "TST",
    decimals: 6,
    mint: "HTxwKcEg5j6YnmcxVm2MCWjaNn5HarievkjqzHATPmXd",
  },
  30: {
    symbol: "asd",
    name: "asd",
    decimals: 6,
    mint: "2Fkh2Vdv4mF9CeRjvNCkdp13z87BoDmNFh7YHn3ydYpD",
  },
};

// Instrument metadata from the Deriverse logs
const INSTRUMENT_METADATA: Record<
  number,
  { symbol: string; baseTokenId: number; quoteTokenId: number; address: string }
> = {
  0: {
    symbol: "SOL/USDC",
    baseTokenId: 2,
    quoteTokenId: 1,
    address: "8NAf2miTru5kvk8wTqLgbxMre1MMmQVKxxGuLPvwBUZn",
  },
  2: {
    symbol: "LETTERA/USDC",
    baseTokenId: 4,
    quoteTokenId: 1,
    address: "5q8birNsEjQzJ64u4xfZwbxv8Wpfo1kjaEmV3temTxRP",
  },
  4: {
    symbol: "VELIT/USDC",
    baseTokenId: 6,
    quoteTokenId: 1,
    address: "9aPVbNcTYhk6hHu8ghQGxjkZzam2x1RGFMss4vAzHGqq",
  },
  6: {
    symbol: "SUN/USDC",
    baseTokenId: 8,
    quoteTokenId: 1,
    address: "DNYEgArHwzyhvdrTymgMBB4jEDD1Jz5NCoK3j1YkFv3u",
  },
  8: {
    symbol: "BRSH/USDC",
    baseTokenId: 10,
    quoteTokenId: 1,
    address: "E838zpfdoRPfUScJ6ahNKiGQe3pkJ8Lg5DYCNder4eZA",
  },
  10: {
    symbol: "MSHK/USDC",
    baseTokenId: 12,
    quoteTokenId: 1,
    address: "71g36wkPR2QDCyYJefwQofgVnt7wGsGjDUz36tjN1LBh",
  },
  12: {
    symbol: "SOL/USDC",
    baseTokenId: 14,
    quoteTokenId: 1,
    address: "NLY5qHiDUtmkPGFih9yV433sPqW5C5e54BEg5A8khkX",
  },
  14: {
    symbol: "trs/USDC",
    baseTokenId: 16,
    quoteTokenId: 1,
    address: "8xBuPQ3PMP1DWY4a9TUiwz83oMdtGb4UV4mPxuSZvDg",
  },
  16: {
    symbol: "sad/USDC",
    baseTokenId: 18,
    quoteTokenId: 1,
    address: "9q1CrBq4nE3d8iHzP74h7NmLFcCdmpFXxStgRF35Qmh6",
  },
  18: {
    symbol: "MDVD/USDC",
    baseTokenId: 20,
    quoteTokenId: 1,
    address: "agCRUdRMjKP6w7N5mbYWpsZsyAWZTjJPDU2Q5L5u3QG",
  },
  20: {
    symbol: "333/USDC",
    baseTokenId: 22,
    quoteTokenId: 1,
    address: "83YM9m3EX4dxoP4rYBsVCpzMvk31GpvBJsXcrLg7qhUs",
  },
  22: {
    symbol: "BRSH/USDC",
    baseTokenId: 24,
    quoteTokenId: 1,
    address: "99PJiZjy7FudZq9F9wLuDdAiBUBffp6oQwtzJHp4jWds",
  },
  24: {
    symbol: "1/USDC",
    baseTokenId: 26,
    quoteTokenId: 1,
    address: "GX9jVDkZ9hwCejn7JzC6UZZcxLvMRxbz6PLJFWUHMAuA",
  },
  26: {
    symbol: "TST/USDC",
    baseTokenId: 28,
    quoteTokenId: 1,
    address: "H1eUA2h1hwq32y2HQchmsXpinya7jFeJwJSdLwWvYx1P",
  },
  28: {
    symbol: "asd/USDC",
    baseTokenId: 30,
    quoteTokenId: 1,
    address: "C4Ku8mdJ59pbXCQUHiGeEMeGndRbqJWCR3ToBG4Rvz1",
  },
};

// AccountType constants from the original Engine
const AccountType = {
  ROOT: 2,
  COMMUNITY: 34,
  TOKEN: 4,
  INSTR: 7,
  DRVS_AUTHORITY: 5,
  SPOT_MAPS: 10,
  SPOT_BIDS_TREE: 14,
  SPOT_ASKS_TREE: 15,
  SPOT_BID_ORDERS: 16,
  SPOT_ASK_ORDERS: 17,
  SPOT_LINES: 18,
  SPOT_CLIENT_INFOS: 12,
  SPOT_CLIENT_INFOS2: 13,
  SPOT_1M_CANDLES: 19,
  SPOT_15M_CANDLES: 20,
  SPOT_DAY_CANDLES: 21,
  PERP_MAPS: 47,
  PERP_BIDS_TREE: 39,
  PERP_ASKS_TREE: 37,
  PERP_BID_ORDERS: 38,
  PERP_ASK_ORDERS: 36,
  PERP_LINES: 46,
  PERP_CLIENT_INFOS: 41,
  PERP_CLIENT_INFOS2: 42,
  PERP_CLIENT_INFOS3: 43,
  PERP_CLIENT_INFOS4: 44,
  PERP_CLIENT_INFOS5: 45,
  PERP_LONG_PX_TREE: 48,
  PERP_SHORT_PX_TREE: 49,
  PERP_REBALANCE_TIME_TREE: 50,
  CLIENT_PRIMARY: 31,
  CLIENT_COMMUNITY: 35,
  PRIVATE_CLIENTS: 51,
};

export class EngineAdapter {
  private engine: any;

  // Public properties that match the original Engine
  public instruments: Map<any, any>;
  public tokens: Map<any, any>;
  public version: number;
  public programId: any;
  public commitment: string;
  public rootAccount: any;
  public communityAccount: any;
  public rootStateModel: any;
  public community: any;
  public drvsAuthority: any;
  public privateMode: boolean;
  public signer: any;
  public originalClientId: number | null;
  public clientPrimaryAccount: any;
  public clientCommunityAccount: any;
  public clientLutAddress: any;
  public uiNumbers: boolean;
  public clientId: number | null;

  constructor(
    private rpc: any,
    args?: {
      programId?: string;
      version?: number;
      commitment?: string;
      uiNumbers?: boolean;
    },
  ) {
    // Set configuration from args or use defaults from your app
    this.programId = args?.programId
      ? address(args.programId)
      : address("Drvrseg8AQLP8B96DBGmHRjFGviFNYTkHueY9g3k27Gu");

    this.version = args?.version || 14;
    this.commitment = args?.commitment || "confirmed";
    this.uiNumbers = args?.uiNumbers !== false;

    // Initialize maps with hardcoded data
    this.tokens = new Map();
    this.instruments = new Map();
    this.clientId = null;

    // Initialize token data from hardcoded metadata
    Object.entries(TOKEN_METADATA).forEach(([id, data]) => {
      const tokenId = parseInt(id);
      this.tokens.set(tokenId, {
        id: tokenId,
        symbol: data.symbol,
        name: data.name,
        decimals: data.decimals,
        mint: address(data.mint),
        programAddress:
          tokenId === -1
            ? address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
            : address("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
        mask: data.decimals, // mask contains decimals in lower bits
      });
    });

    // Initialize instrument data from hardcoded metadata
    Object.entries(INSTRUMENT_METADATA).forEach(([id, data]) => {
      const instrId = parseInt(id);
      this.instruments.set(instrId, {
        address: address(data.address),
        header: {
          instrId,
          assetTokenId: data.baseTokenId,
          crncyTokenId: data.quoteTokenId,
          mask: 0,
          symbol: data.symbol,
          lutAddress: null,
          mapsAddress: null,
          perpMapsAddress: null,
        },
        spotBids: [],
        spotAsks: [],
        perpBids: [],
        perpAsks: [],
      });
    });

    // Initialize other properties
    this.rootAccount = null;
    this.communityAccount = null;
    this.rootStateModel = null;
    this.community = null;
    this.drvsAuthority = null;
    this.privateMode = false;
    this.signer = null;
    this.originalClientId = null;
    this.clientPrimaryAccount = null;
    this.clientCommunityAccount = null;
    this.clientLutAddress = null;

    // Try to load and initialize the real Engine
    this.initializeEngine();
  }

  private async initializeEngine(): Promise<void> {
    try {
      // Load the real Engine class
      const { Engine: RealEngine } = require("@deriverse/kit");

      // Create the real engine with our config
      this.engine = new RealEngine(this.rpc, {
        programId: this.programId,
        version: this.version,
        commitment: this.commitment,
        uiNumbers: this.uiNumbers,
      });

      // Ensure engine has maps initialized
      this.engine.instruments = this.engine.instruments || new Map();
      this.engine.tokens = this.engine.tokens || new Map();

      // Copy our hardcoded data to the engine
      this.tokens.forEach((value, key) => {
        this.engine.tokens.set(key, value);
      });
      this.instruments.forEach((value, key) => {
        this.engine.instruments.set(key, value);
      });

      // First, derive drvsAuthority
      try {
        const [drvsAuthority] = await getProgramDerivedAddress({
          programAddress: this.programId,
          seeds: ["ndxnt"],
        });
        this.engine.drvsAuthority = drvsAuthority;
        this.drvsAuthority = drvsAuthority;
        console.log("✅ Derived drvsAuthority:", drvsAuthority);
      } catch (e) {
        console.warn("Failed to derive drvsAuthority:", e);
      }

      // Derive root and community accounts
      try {
        const encoder = getAddressEncoder();

        // Root account
        const rootBuf = Buffer.alloc(8);
        rootBuf.writeInt32LE(this.version, 0);
        rootBuf.writeInt32LE(AccountType.ROOT, 4);

        const [rootAccount] = await getProgramDerivedAddress({
          programAddress: this.programId,
          seeds: [rootBuf, encoder.encode(this.drvsAuthority)],
        });
        this.engine.rootAccount = rootAccount;
        this.rootAccount = rootAccount;
        console.log("✅ Derived root account:", rootAccount);

        // Community account
        const communityBuf = Buffer.alloc(8);
        communityBuf.writeInt32LE(this.version, 0);
        communityBuf.writeInt32LE(AccountType.COMMUNITY, 4);

        const [communityAccount] = await getProgramDerivedAddress({
          programAddress: this.programId,
          seeds: [communityBuf, encoder.encode(this.drvsAuthority)],
        });
        this.engine.communityAccount = communityAccount;
        this.communityAccount = communityAccount;
        console.log("✅ Derived community account:", communityAccount);
      } catch (e) {
        console.warn("Failed to derive accounts:", e);
      }

      // Patch the logsDecode method to be safe
      this.patchLogsDecode();

      console.log("✅ EngineAdapter fully initialized");
      console.log(`   Tokens loaded: ${this.tokens.size}`);
      console.log(`   Instruments loaded: ${this.instruments.size}`);
    } catch (err) {
      console.error("Failed to initialize EngineAdapter:", err);
      this.createFallbackEngine();
    }
  }

  private patchLogsDecode(): void {
    if (!this.engine || typeof this.engine.logsDecode !== "function") {
      return;
    }

    const originalLogsDecode = this.engine.logsDecode.bind(this.engine);

    this.engine.logsDecode = async (logs: readonly string[]) => {
      try {
        // Ensure maps exist
        if (!this.engine.instruments) {
          this.engine.instruments = this.instruments;
        }
        if (!this.engine.tokens) {
          this.engine.tokens = this.tokens;
        }

        // Try original decode
        const result = await originalLogsDecode(logs);
        return result || [];
      } catch (err) {
        console.warn("LogsDecode failed, using fallback:", err);
        return this.fallbackLogsDecode(logs);
      }
    };
  }

  private fallbackLogsDecode(logs: readonly string[]): any[] {
    const decoded: any[] = [];

    for (const log of logs) {
      // Look for Program data logs
      const match = log.match(/Program data:\s*([A-Za-z0-9+/=]+)/i);
      if (match && match[1]) {
        try {
          const buffer = Buffer.from(match[1], "base64");

          // Try to parse based on first byte (tag)
          if (buffer.length > 0) {
            const tag = buffer[0];

            // Create a basic decoded object
            const decodedLog: any = {
              tag,
              raw: buffer.toString("hex"),
              timestamp: Date.now(),
            };

            // Try to extract common fields based on tag
            if (tag === 11 || tag === 19) {
              // Fill events
              if (buffer.length >= 48) {
                decodedLog.side = buffer.readUInt8(1);
                decodedLog.clientId = buffer.readUInt32LE(4);
                decodedLog.orderId = Number(buffer.readBigInt64LE(8));
                decodedLog.qty = Number(buffer.readBigInt64LE(16));
                decodedLog.crncy = Number(buffer.readBigInt64LE(24));
                decodedLog.price = Number(buffer.readBigInt64LE(32));
                decodedLog.rebates = Number(buffer.readBigInt64LE(40));
              }
            }

            decoded.push(decodedLog);
          }
        } catch (e) {
          // Ignore decode errors
        }
      }
    }

    return decoded;
  }

  private createFallbackEngine(): void {
    console.log("Creating fallback engine with basic functionality");

    this.engine = {
      programId: this.programId,
      version: this.version,
      commitment: this.commitment,
      uiNumbers: this.uiNumbers,
      instruments: this.instruments,
      tokens: this.tokens,
      rootAccount: this.rootAccount,
      communityAccount: this.communityAccount,
      rootStateModel: this.rootStateModel,
      community: this.community,
      drvsAuthority: this.drvsAuthority,
      privateMode: this.privateMode,
      signer: this.signer,
      originalClientId: this.originalClientId,
      clientPrimaryAccount: this.clientPrimaryAccount,
      clientCommunityAccount: this.clientCommunityAccount,
      clientLutAddress: this.clientLutAddress,
      clientId: this.clientId,

      findAccountsByTag: async (tag: number, dataSlice?: any) => {
        return this.findAccountsByTag(tag, dataSlice);
      },

      getAccountByTag: async (tag: number) => {
        try {
          const encoder = getAddressEncoder();
          const buf = Buffer.alloc(8);
          buf.writeInt32LE(this.version, 0);
          buf.writeInt32LE(tag, 4);

          const [address] = await getProgramDerivedAddress({
            programAddress: this.programId,
            seeds: [buf, encoder.encode(this.drvsAuthority || "ndxnt")],
          });
          return address;
        } catch {
          return null;
        }
      },

      getTokenAccount: async (mint: any) => {
        try {
          const encoder = getAddressEncoder();
          const buf = Buffer.from(encoder.encode(mint).buffer);
          buf.writeInt32LE(this.version, 28);

          const [address] = await getProgramDerivedAddress({
            programAddress: this.programId,
            seeds: [buf, encoder.encode(this.drvsAuthority || "ndxnt")],
          });
          return address;
        } catch {
          return null;
        }
      },

      getTokenId: async (mint: any) => {
        const mintStr = mint.toString();
        for (const [id, token] of this.tokens.entries()) {
          if (token.mint?.toString() === mintStr) return id;
        }
        return null;
      },

      getInstrId: async (args: any) => {
        for (const [id, instr] of this.instruments.entries()) {
          if (
            instr.header.assetTokenId === args.assetTokenId &&
            instr.header.crncyTokenId === args.crncyTokenId
          ) {
            return id;
          }
        }
        return null;
      },

      setSigner: async (signer: any) => {
        this.signer = signer;
        this.engine.signer = signer;

        // Try to get client ID from the API if possible
        try {
          // You might want to fetch this from your backend or Deriverse API
          // For now, we'll set a placeholder
          this.clientId = 907; // From the logs
          this.originalClientId = 907;
        } catch (err) {
          console.warn("Could not set client ID:", err);
        }
      },

      checkClient: async () => true,

      getClientData: async () => ({
        clientId: this.clientId || 907,
        mask: 0,
        points: 0,
        slot: 0,
        spotTrades: 0,
        lpTrades: 0,
        perpTrades: 0,
        tokens: new Map(),
        lp: new Map(),
        spot: new Map(),
        perp: new Map(),
        refProgram: null,
        community: { header: null, data: new Map() },
        refLinks: [],
      }),

      getClientSpotOrdersInfo: async () => ({
        bidsCount: 0,
        asksCount: 0,
        bidsEntry: 0,
        asksEntry: 0,
      }),

      getClientSpotOrders: async () => ({ bids: [], asks: [] }),

      getClientPerpOrdersInfo: async () => ({
        bidsCount: 0,
        asksCount: 0,
        bidsEntry: 0,
        asksEntry: 0,
      }),

      getClientPerpOrders: async () => ({ bids: [], asks: [] }),

      logsDecode: async (logs: readonly string[]) => {
        return this.fallbackLogsDecode(logs);
      },
    };
  }

  async findAccountsByTag(tag: number, dataSlice?: any): Promise<any[]> {
    try {
      const tagBuf = Buffer.alloc(8);
      tagBuf.writeUInt32LE(tag, 0);
      tagBuf.writeUInt32LE(this.version, 4);

      const { encode } = require("bs58");

      const accounts = await this.rpc
        .getProgramAccounts(this.programId, {
          encoding: "base64",
          dataSlice: dataSlice,
          filters: [
            {
              memcmp: {
                offset: BigInt(0),
                encoding: "base58",
                bytes: encode(tagBuf),
              },
            },
          ],
        })
        .send();

      return accounts || [];
    } catch (err) {
      return [];
    }
  }

  async setSigner(signer: any): Promise<void> {
    this.signer = signer;
    if (this.engine && typeof this.engine.setSigner === "function") {
      try {
        await this.engine.setSigner(signer);
        this.originalClientId = this.engine.originalClientId;
        this.clientPrimaryAccount = this.engine.clientPrimaryAccount;
        this.clientCommunityAccount = this.engine.clientCommunityAccount;
        this.clientLutAddress = this.engine.clientLutAddress;

        // Try to get client ID
        if (this.engine.clientId) {
          this.clientId = this.engine.clientId;
        }
      } catch (err) {
        // Fallback - just store the signer
      }
    }
  }

  async getClientData(): Promise<any> {
    if (this.engine && typeof this.engine.getClientData === "function") {
      try {
        const data = await this.engine.getClientData();
        if (data && data.clientId) {
          this.clientId = data.clientId;
        }
        return data;
      } catch (err) {
        // Fall through to fallback
      }
    }

    return {
      clientId: this.clientId || 907,
      mask: 0,
      points: 0,
      slot: 0,
      spotTrades: 0,
      lpTrades: 0,
      perpTrades: 0,
      tokens: new Map(),
      lp: new Map(),
      spot: new Map(),
      perp: new Map(),
      refProgram: null,
      community: { header: null, data: new Map() },
      refLinks: [],
    };
  }

  async getClientSpotOrdersInfo(args: any): Promise<any> {
    if (
      this.engine &&
      typeof this.engine.getClientSpotOrdersInfo === "function"
    ) {
      try {
        return await this.engine.getClientSpotOrdersInfo(args);
      } catch (err) {
        // Fall through
      }
    }
    return { bidsCount: 0, asksCount: 0, bidsEntry: 0, asksEntry: 0 };
  }

  async getClientSpotOrders(args: any): Promise<any> {
    if (this.engine && typeof this.engine.getClientSpotOrders === "function") {
      try {
        return await this.engine.getClientSpotOrders(args);
      } catch (err) {
        // Fall through
      }
    }
    return { bids: [], asks: [] };
  }

  async getClientPerpOrdersInfo(args: any): Promise<any> {
    if (
      this.engine &&
      typeof this.engine.getClientPerpOrdersInfo === "function"
    ) {
      try {
        return await this.engine.getClientPerpOrdersInfo(args);
      } catch (err) {
        // Fall through
      }
    }
    return { bidsCount: 0, asksCount: 0, bidsEntry: 0, asksEntry: 0 };
  }

  async getClientPerpOrders(args: any): Promise<any> {
    if (this.engine && typeof this.engine.getClientPerpOrders === "function") {
      try {
        return await this.engine.getClientPerpOrders(args);
      } catch (err) {
        // Fall through
      }
    }
    return { bids: [], asks: [] };
  }

  async getTokenId(mint: any): Promise<number | null> {
    if (this.engine && typeof this.engine.getTokenId === "function") {
      try {
        return await this.engine.getTokenId(mint);
      } catch (err) {
        // Fall through
      }
    }

    const mintStr = mint.toString();
    for (const [id, token] of this.tokens.entries()) {
      if (token.mint?.toString() === mintStr) return id;
    }
    return null;
  }

  async getInstrId(args: any): Promise<number | null> {
    if (this.engine && typeof this.engine.getInstrId === "function") {
      try {
        return await this.engine.getInstrId(args);
      } catch (err) {
        // Fall through
      }
    }

    for (const [id, instr] of this.instruments.entries()) {
      if (
        instr.header.assetTokenId === args.assetTokenId &&
        instr.header.crncyTokenId === args.crncyTokenId
      ) {
        return id;
      }
    }
    return null;
  }

  async logsDecode(logs: readonly string[]): Promise<any[]> {
    if (this.engine && typeof this.engine.logsDecode === "function") {
      try {
        // Ensure maps exist before calling
        if (!this.engine.instruments)
          this.engine.instruments = this.instruments;
        if (!this.engine.tokens) this.engine.tokens = this.tokens;

        return await this.engine.logsDecode(logs);
      } catch (err) {
        console.warn("LogsDecode failed, using fallback:", err);
      }
    }

    return this.fallbackLogsDecode(logs);
  }

  // Helper method to get token symbol by ID
  getTokenSymbol(tokenId: number): string {
    return TOKEN_METADATA[tokenId]?.symbol || `TOKEN-${tokenId}`;
  }

  // Helper method to get instrument symbol by ID
  getInstrumentSymbol(instrId: number): string {
    return INSTRUMENT_METADATA[instrId]?.symbol || `INSTR-${instrId}`;
  }

  // Helper method to get instrument by ID
  getInstrument(instrId: number): any {
    return this.instruments.get(instrId) || INSTRUMENT_METADATA[instrId];
  }

  // Helper method to get token by ID
  getToken(tokenId: number): any {
    return this.tokens.get(tokenId) || TOKEN_METADATA[tokenId];
  }

  // Forward instruction methods
  async depositInstruction(args: any): Promise<any> {
    if (this.engine && typeof this.engine.depositInstruction === "function") {
      return await this.engine.depositInstruction(args);
    }
    throw new Error("depositInstruction not available");
  }

  async withdrawInstruction(args: any): Promise<any> {
    if (this.engine && typeof this.engine.withdrawInstruction === "function") {
      return await this.engine.withdrawInstruction(args);
    }
    throw new Error("withdrawInstruction not available");
  }

  async newSpotOrderInstruction(args: any): Promise<any> {
    if (
      this.engine &&
      typeof this.engine.newSpotOrderInstruction === "function"
    ) {
      return await this.engine.newSpotOrderInstruction(args);
    }
    throw new Error("newSpotOrderInstruction not available");
  }

  async newPerpOrderInstruction(args: any): Promise<any> {
    if (
      this.engine &&
      typeof this.engine.newPerpOrderInstruction === "function"
    ) {
      return await this.engine.newPerpOrderInstruction(args);
    }
    throw new Error("newPerpOrderInstruction not available");
  }

  async getSignaturesForAddress(
    address: any,
    limit: number = 10,
    before?: string,
  ): Promise<any[]> {
    try {
      const params: any = { limit };
      if (before) {
        params.before = before;
      }

      const signatures = await this.rpc
        .getSignaturesForAddress(address, params)
        .send();

      return signatures || [];
    } catch (err) {
      console.warn("getSignaturesForAddress failed:", err);
      return [];
    }
  }

  async getTransaction(signature: string): Promise<any> {
    try {
      const tx = await this.rpc
        .getTransaction(signature, {
          encoding: "jsonParsed",
          maxSupportedTransactionVersion: 0,
        })
        .send();
      return tx;
    } catch (err) {
      console.warn(`getTransaction failed for ${signature}:`, err);
      return null;
    }
  }

  get engineInstance() {
    return this.engine;
  }
}

export default EngineAdapter;
