import { TransactionType } from '@msafe/sui3-utils';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { WalletAccount } from '@mysten/wallet-standard';
import { Network, TurbosSdk } from 'turbos-clmm-sdk';

import { BaseIntentionLegacy } from '@/apps/interface/sui-js';

import { CreatePoolIntentionData, SuiNetworks, TransactionSubType } from '../types';

export class CreatePoolIntention extends BaseIntentionLegacy<CreatePoolIntentionData> {
  txType!: TransactionType.Other;

  txSubType!: TransactionSubType.AddLiquidity;

  constructor(public override readonly data: CreatePoolIntentionData) {
    super(data);
  }

  async build(input: {
    suiClient: SuiClient;
    account: WalletAccount;
    network: SuiNetworks;
  }): Promise<TransactionBlock> {
    const turbosSdk = new TurbosSdk(input.network.replace('sui:', '') as Network, input.suiClient);
    const {
      fee,
      address,
      tickLower,
      tickUpper,
      sqrtPrice,
      slippage,
      coinTypeA,
      coinTypeB,
      amountA,
      amountB,
      deadline,
      txb,
    } = this.data;

    return turbosSdk.pool.createPool({
      fee,
      amountA,
      amountB,
      address,
      tickLower,
      tickUpper,
      sqrtPrice,
      slippage,
      coinTypeA,
      coinTypeB,
      deadline,
      txb,
    });
  }

  static fromData(data: CreatePoolIntentionData) {
    return new CreatePoolIntention(data);
  }
}
