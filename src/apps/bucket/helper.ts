import { TransactionType } from '@msafe/sui3-utils';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { IdentifierString, WalletAccount } from '@mysten/wallet-standard';

import { BucketIntentionData } from '@/apps/bucket/types/helper';
import { IAppHelperInternal } from '@/apps/interface/sui';
import { SuiNetworks } from '@/types';

import {
  BorrowIntentionData,
  CloseIntentionData,
  LockClaimIntentionData,
  PsmIntentionData,
  RepayIntentionData,
  SBUCKClaimIntentionData,
  SBUCKDepositIntentionData,
  SBUCKUnstakeIntentionData,
  SBUCKWithdrawIntentionData,
  TankClaimIntentionData,
  TankDepositIntentionData,
  TankWithdrawIntentionData,
  WithdrawIntentionData,
} from './api';
import { Decoder } from './decoder';
import {
  BorrowIntention,
  CloseIntention,
  LockClaimIntention,
  PsmIntention,
  RepayIntention,
  SBUCKClaimIntention,
  SBUCKDepositIntention,
  SBUCKUnstakeIntention,
  SBUCKWithdrawIntention,
  TankClaimIntention,
  TankDepositIntention,
  TankWithdrawIntention,
  WithdrawIntention,
} from './intentions';
import { TransactionSubType } from './types';

export type BucketIntention =
  | PsmIntention
  | BorrowIntention
  | WithdrawIntention
  | RepayIntention
  | CloseIntention
  | TankDepositIntention
  | TankWithdrawIntention
  | TankClaimIntention
  | SBUCKDepositIntention
  | SBUCKWithdrawIntention
  | SBUCKUnstakeIntention
  | SBUCKClaimIntention
  | LockClaimIntention;

export class BucketHelper implements IAppHelperInternal<BucketIntentionData> {
  application = 'bucket';

  supportSDK = '@mysten/sui' as const;

  // TODO: Please refer to the documentation and move the `action` and `txbParams` params into the `appContext` structure.
  async deserialize(input: {
    transaction: Transaction;
    chain: IdentifierString;
    network: SuiNetworks;
    suiClient: SuiClient;
    account: WalletAccount;
  }): Promise<{ txType: TransactionType; txSubType: string; intentionData: BucketIntentionData }> {
    console.log('Bucket helper deserialize input: ', input);
    const { transaction } = input;
    const decoder = new Decoder(transaction);
    const result = decoder.decode();
    return {
      txType: TransactionType.Other,
      txSubType: result.type,
      intentionData: result.intentionData,
    };
  }

  async build(input: {
    intentionData: BucketIntentionData;
    txType: TransactionType;
    txSubType: string;
    suiClient: SuiClient;
    account: WalletAccount;
    network: SuiNetworks;
  }): Promise<Transaction> {
    const { suiClient, account, network } = input;

    let intention: BucketIntention;
    switch (input.txSubType) {
      case TransactionSubType.Psm:
        intention = PsmIntention.fromData(input.intentionData as PsmIntentionData);
        break;
      case TransactionSubType.Borrow:
        intention = BorrowIntention.fromData(input.intentionData as BorrowIntentionData);
        break;
      case TransactionSubType.Withdraw:
        intention = WithdrawIntention.fromData(input.intentionData as WithdrawIntentionData);
        break;
      case TransactionSubType.Repay:
        intention = RepayIntention.fromData(input.intentionData as RepayIntentionData);
        break;
      case TransactionSubType.Close:
        intention = CloseIntention.fromData(input.intentionData as CloseIntentionData);
        break;
      case TransactionSubType.TankDeposit:
        intention = TankDepositIntention.fromData(input.intentionData as TankDepositIntentionData);
        break;
      case TransactionSubType.TankWithdraw:
        intention = TankWithdrawIntention.fromData(input.intentionData as TankWithdrawIntentionData);
        break;
      case TransactionSubType.TankClaim:
        intention = TankClaimIntention.fromData(input.intentionData as TankClaimIntentionData);
        break;
      case TransactionSubType.SBUCKDeposit:
        intention = SBUCKDepositIntention.fromData(input.intentionData as SBUCKDepositIntentionData);
        break;
      case TransactionSubType.SBUCKUnstake:
        intention = SBUCKUnstakeIntention.fromData(input.intentionData as SBUCKUnstakeIntentionData);
        break;
      case TransactionSubType.SBUCKWithdraw:
        intention = SBUCKWithdrawIntention.fromData(input.intentionData as SBUCKWithdrawIntentionData);
        break;
      case TransactionSubType.SBUCKClaim:
        intention = SBUCKClaimIntention.fromData(input.intentionData as SBUCKClaimIntentionData);
        break;
      case TransactionSubType.LockClaim:
        intention = LockClaimIntention.fromData(input.intentionData as LockClaimIntentionData);
        break;
      default:
        throw new Error('not implemented');
    }

    return intention.build({ suiClient, account, network });
  }
}
