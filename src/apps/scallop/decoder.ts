import { TransactionType } from '@msafe/sui3-utils';
import { bcs } from '@mysten/sui.js/bcs';
import { MoveCallTransaction, SplitCoinsTransaction } from '@mysten/sui.js/dist/cjs/builder';
import { TransactionBlockInput, TransactionBlock } from '@mysten/sui.js/transactions';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui.js/utils';

import { OLD_BORROW_INCENTIVE_PROTOCOL_ID } from './constants';
import { ScallopBuilder } from './models';
import { SupportBorrowIncentiveRewardCoins, SupportStakeMarketCoins } from './types';
import { TransactionSubType } from './types/utils';

type DecodeResult = {
  txType: TransactionType;
  type: TransactionSubType;
  intentionData: any;
};

export class Decoder {
  private _builder: ScallopBuilder;

  constructor(
    public readonly txb: TransactionBlock,
    builder: ScallopBuilder,
  ) {
    this._builder = builder;
  }

  decode() {
    if (this.isSupplyWithStakeSpoolTransaction()) {
      return this.decodeSupplyWithStakeSpool();
    }
    if (this.isUnstakeAndWithdrawTransaction()) {
      return this.decodeUnstakeAndWithdraw();
    }
    if (this.isStakeSpoolTransaction()) {
      return this.decodeStakeSpool();
    }
    if (this.isDepositCollateralTransaction()) {
      return this.decodeDepositCollateral();
    }
    if (this.isWithdrawCollateralTransaction()) {
      return this.decodeWithdrawCollateral();
    }
    if (this.isWithdrawLendingTransaction()) {
      return this.decodeWithdrawLending();
    }
    if (this.isSupplyLendingTransaction()) {
      return this.decodeSupplyLending();
    }
    if (this.isBorrowTransaction()) {
      return this.decodeBorrow();
    }
    if (this.isRepayTransaction()) {
      return this.decodeRepay();
    }
    if (this.isUnstakeSpoolTransaction()) {
      return this.decodeUnstakeSpool();
    }
    if (this.isClaimRewardTransaction()) {
      return this.decodeClaimReward();
    }
    throw new Error(`Unknown transaction type`);
  }

  private get coreId() {
    return {
      protocolPkg: this._builder.address.get('core.packages.protocol.id'),
      market: this._builder.address.get('core.market'),
      version: this._builder.address.get('core.version'),
      coinDecimalsRegistry: this._builder.address.get('core.coinDecimalsRegistry'),
      xOracle: this._builder.address.get('core.oracles.xOracle'),
      spoolPkg: this._builder.address.get('spool.id'),
      borrowIncentivePkg: this._builder.address.get('borrowIncentive.id'),
    };
  }

  private get transactions() {
    return this.txb.blockData.transactions;
  }

  private get inputTransaction() {
    return this.txb.blockData.inputs;
  }

  private getMoveCallTransaction(target: string) {
    return this.transactions.find((trans) => trans.kind === 'MoveCall' && trans.target === target);
  }

  private isSupplyLendingTransaction() {
    return !!this.getMoveCallTransaction(`${this.coreId.protocolPkg}::mint::mint`);
  }

  private isSupplyWithStakeSpoolTransaction() {
    const supplyMoveCall = this.getMoveCallTransaction(`${this.coreId.protocolPkg}::mint::mint`);
    const stakeMoveCall = this.getMoveCallTransaction(`${this.coreId.spoolPkg}::user::stake`);
    return !!supplyMoveCall && !!stakeMoveCall;
  }

  private isUnstakeAndWithdrawTransaction() {
    const unstakeMoveCall = this.getMoveCallTransaction(`${this.coreId.spoolPkg}::user::unstake`);
    const withdrawMoveCall = this.getMoveCallTransaction(`${this.coreId.protocolPkg}::redeem::redeem`);
    return !!unstakeMoveCall && !!withdrawMoveCall;
  }

  private isStakeSpoolTransaction() {
    return !!this.getMoveCallTransaction(`${this.coreId.spoolPkg}::user::stake`);
  }

  private isWithdrawLendingTransaction() {
    return !!this.getMoveCallTransaction(`${this.coreId.protocolPkg}::redeem::redeem`);
  }

  private isDepositCollateralTransaction() {
    return !!this.getMoveCallTransaction(`${this.coreId.protocolPkg}::deposit_collateral::deposit_collateral`);
  }

  private isWithdrawCollateralTransaction() {
    return !!this.getMoveCallTransaction(`${this.coreId.protocolPkg}::withdraw_collateral::withdraw_collateral`);
  }

  private isBorrowTransaction() {
    return !!this.getMoveCallTransaction(`${this.coreId.protocolPkg}::borrow::borrow`);
  }

  private isRepayTransaction() {
    return !!this.getMoveCallTransaction(`${this.coreId.protocolPkg}::repay::repay`);
  }

  private isUnstakeSpoolTransaction() {
    return !!this.getMoveCallTransaction(`${this.coreId.spoolPkg}::user::unstake`);
  }

  private isCreateStakeAccountTransaction() {
    return !!this.getMoveCallTransaction(`${this.coreId.spoolPkg}::user::new_spool_account`);
  }

  private isClaimRewardTransaction() {
    const lendingIncentive = this.getMoveCallTransaction(`${this.coreId.spoolPkg}::user::redeem_rewards`);
    const borrowIncentiveV2 = this.getMoveCallTransaction(`${this.coreId.borrowIncentivePkg}::user::redeem_rewards`);
    return !!lendingIncentive && !!borrowIncentiveV2;
  }

  private decodeSupplyLending(): DecodeResult {
    const coinName = this._builder.utils.parseCoinNameFromType(this.helperMint.typeArg(0));
    const amount = this.helperMint.getNestedInputParam<SplitCoinsTransaction>(2);
    const amountFromSplitCoin = new SplitCoinHelper(amount, this.txb).getAmountInput().reduce((a, b) => a + b, 0);
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.SupplyLending,
      intentionData: {
        amount: amountFromSplitCoin,
        coinName,
      },
    };
  }

  private decodeWithdrawLending(): DecodeResult {
    const coinName = this._builder.utils.parseCoinNameFromType(this.helperRedeem.typeArg(0));
    const amount = this.helperRedeem.getNestedInputParam<SplitCoinsTransaction>(2);
    const amountFromSplitCoin = new SplitCoinHelper(amount, this.txb).getAmountInput().reduce((a, b) => a + b, 0);
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.WithdrawLending,
      intentionData: {
        amount: amountFromSplitCoin,
        coinName,
      },
    };
  }

  private decodeDepositCollateral(): DecodeResult {
    const coinName = this._builder.utils.parseCoinNameFromType(this.helperDepositCollateral.typeArg(0));
    const amount = this.helperDepositCollateral.getNestedInputParam<SplitCoinsTransaction>(3);
    const amountFromSplitCoin = new SplitCoinHelper(amount, this.txb).getAmountInput().reduce((a, b) => a + b, 0);
    const obligationId = this.helperDepositCollateral.decodeSharedObjectId(1);
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.DepositCollateral,
      intentionData: {
        amount: amountFromSplitCoin,
        obligationId,
        coinName,
      },
    };
  }

  private decodeWithdrawCollateral(): DecodeResult {
    const coinName = this._builder.utils.parseCoinNameFromType(this.helperWithdrawCollateral.typeArg(0));
    const amount = this.helperWithdrawCollateral.decodeInputU64(5);
    const obligationId = this.helperWithdrawCollateral.decodeSharedObjectId(1);
    const obligationKey = this.helperWithdrawCollateral.decodeOwnedObjectId(2);
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.WithdrawCollateral,
      intentionData: {
        amount,
        coinName,
        obligationKey,
        obligationId,
      },
    };
  }

  private decodeBorrow(): DecodeResult {
    const coinName = this._builder.utils.parseCoinNameFromType(this.helperBorrow.typeArg(0));
    const amount = this.helperBorrow.decodeInputU64(5);
    const obligationId = this.helperBorrow.decodeSharedObjectId(1);
    const obligationKey = this.helperBorrow.decodeOwnedObjectId(2);
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.Borrow,
      intentionData: {
        amount,
        coinName,
        obligationKey,
        obligationId,
      },
    };
  }

  private decodeRepay(): DecodeResult {
    const coinName = this._builder.utils.parseCoinNameFromType(this.helperRepay.typeArg(0));
    const amount = this.helperRepay.getNestedInputParam<SplitCoinsTransaction>(3);
    const amountFromSplitCoin = new SplitCoinHelper(amount, this.txb).getAmountInput().reduce((a, b) => a + b, 0);
    const obligationId = this.helperRepay.decodeSharedObjectId(1);
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.Repay,
      intentionData: {
        amount: amountFromSplitCoin,
        obligationId,
        coinName,
      },
    };
  }

  private decodeStakeSpool(): DecodeResult {
    let stakeSpoolAccount;
    if (!this.isCreateStakeAccountTransaction()) {
      stakeSpoolAccount = this.helperStake.decodeOwnedObjectId(1);
    }
    const amount = this.helperStake.getNestedInputParam<SplitCoinsTransaction>(2);
    const amountFromSplitCoin = new SplitCoinHelper(amount, this.txb).getAmountInput().reduce((a, b) => a + b, 0);
    const coinType = this.helperStake.typeArg(0);
    const coinName = this._builder.utils.parseCoinNameFromType(coinType);
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.StakeSpool,
      intentionData: {
        amount: amountFromSplitCoin,
        marketCoinName: coinName,
        stakeAccountId: stakeSpoolAccount,
      },
    };
  }

  private decodeUnstakeSpool(): DecodeResult {
    const stakeSpoolAccount = this.helperUnstake.decodeOwnedObjectId(1);
    const amount = this.helperUnstake.decodeInputU64(2);
    const coinType = this.helperUnstake.typeArg(0);
    const coinName = this._builder.utils.parseCoinNameFromType(coinType);
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.StakeSpool,
      intentionData: {
        amount,
        marketCoinName: coinName,
        stakeAccountId: stakeSpoolAccount,
      },
    };
  }

  private decodeSupplyWithStakeSpool(): DecodeResult {
    const coinName = this._builder.utils.parseCoinNameFromType(this.helperMint.typeArg(0));
    const amount = this.helperMint.getNestedInputParam<SplitCoinsTransaction>(2);
    const amountFromSplitCoin = new SplitCoinHelper(amount, this.txb).getAmountInput().reduce((a, b) => a + b, 0);
    let stakeSpoolAccount;
    if (!this.isCreateStakeAccountTransaction()) {
      stakeSpoolAccount = this.helperStake.decodeOwnedObjectId(1);
    }
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.SupplyAndStakeLending,
      intentionData: {
        amount: amountFromSplitCoin,
        coinType: coinName,
        stakeAccountId: stakeSpoolAccount,
      },
    };
  }

  private decodeUnstakeAndWithdraw(): DecodeResult {
    const stakeAccountWithAmount: { id: string; coin: number }[] = [];
    this.helperUnstakes.forEach((tx) => {
      const stakeAccountId = tx.decodeOwnedObjectId(1);
      const amount = tx.decodeInputU64(2);
      stakeAccountWithAmount.push({ id: stakeAccountId, coin: amount });
    });
    const coinName = this._builder.utils.parseCoinNameFromType(this.helperRedeems[0].typeArg(0));
    const findWithdrawWithNested = this.helperRedeems.find((tx) => tx.isHaveNestedInput(2));
    let amount;
    if (findWithdrawWithNested) {
      amount = new SplitCoinHelper(findWithdrawWithNested.getNestedInputParam<SplitCoinsTransaction>(2), this.txb)
        .getAmountInput()
        .reduce((a, b) => a + b, 0);
    }

    return {
      txType: TransactionType.Other,
      type: TransactionSubType.WithdrawAndUnstakeLending,
      intentionData: {
        amount,
        coinName,
        stakeAccountId: stakeAccountWithAmount,
      },
    };
  }

  private decodeClaimReward(): DecodeResult {
    const lendingReward: {
      stakeMarketCoinName: SupportStakeMarketCoins;
      stakeAccountId: string;
    }[] = [];
    const borrowRewardV2: {
      obligationId: string;
      obligationKey: string;
      rewardCoinName: SupportBorrowIncentiveRewardCoins;
    }[] = [];

    const borrowReward: {
      obligationId: string;
      obligationKey: string;
      rewardCoinName: SupportBorrowIncentiveRewardCoins;
    }[] = [];

    this.helperClaimLendingReward.forEach((tx) => {
      const stakeAccountId = tx.decodeOwnedObjectId(2);
      const stakeMarketCoinName = tx.typeArg(0);
      const coinName = this._builder.utils.parseCoinNameFromType(stakeMarketCoinName);
      lendingReward.push({ stakeMarketCoinName: coinName as SupportStakeMarketCoins, stakeAccountId });
    });

    this.helperClaimBorrowV2Reward.forEach((tx) => {
      const obligationId = tx.decodeSharedObjectId(3);
      const obligationKey = tx.decodeOwnedObjectId(4);
      const rewardCoinName = this._builder.utils.parseCoinNameFromType(
        tx.typeArg(0),
      ) as SupportBorrowIncentiveRewardCoins;
      borrowRewardV2.push({ obligationId, obligationKey, rewardCoinName });
    });

    this.helperClaimBorrowReward.forEach((tx) => {
      const obligationId = tx.decodeSharedObjectId(2);
      const obligationKey = tx.decodeOwnedObjectId(3);
      const rewardCoinName = this._builder.utils.parseCoinNameFromType(
        tx.typeArg(0),
      ) as SupportBorrowIncentiveRewardCoins;
      borrowReward.push({ obligationId, obligationKey, rewardCoinName });
    });

    return {
      txType: TransactionType.Other,
      type: TransactionSubType.ClaimIncentiveReward,
      intentionData: {
        lendingIncentive: lendingReward,
        borrowIncentiveV2: borrowRewardV2,
        borrowIncentive: borrowReward,
      },
    };
  }

  private get helperClaimLendingReward() {
    const moveCalls = this.transactions
      .filter(
        (trans) =>
          trans.kind === 'MoveCall' && trans.target.startsWith(`${this.coreId.spoolPkg}::user::redeem_rewards`),
      )
      .map((trans) => new MoveCallHelper(trans as MoveCallTransaction, this.txb));
    return moveCalls;
  }

  private get helperClaimBorrowV2Reward() {
    const moveCalls = this.transactions
      .filter(
        (trans) =>
          trans.kind === 'MoveCall' &&
          trans.target.startsWith(`${this.coreId.borrowIncentivePkg}::user::redeem_rewards`),
      )
      .map((trans) => new MoveCallHelper(trans as MoveCallTransaction, this.txb));
    return moveCalls;
  }

  private get helperClaimBorrowReward() {
    const moveCalls = this.transactions
      .filter(
        (trans) =>
          trans.kind === 'MoveCall' &&
          trans.target.startsWith(`${OLD_BORROW_INCENTIVE_PROTOCOL_ID}::user::redeem_rewards`),
      )
      .map((trans) => new MoveCallHelper(trans as MoveCallTransaction, this.txb));
    return moveCalls;
  }

  private get helperMint() {
    const moveCall = this.transactions.find(
      (trans) => trans.kind === 'MoveCall' && trans.target.startsWith(`${this.coreId.protocolPkg}::mint::mint`),
    ) as MoveCallTransaction;
    return new MoveCallHelper(moveCall, this.txb);
  }

  private get helperUnstakes() {
    const moveCalls = this.transactions
      .filter((trans) => trans.kind === 'MoveCall' && trans.target.startsWith(`${this.coreId.spoolPkg}::user::unstake`))
      .map((trans) => new MoveCallHelper(trans as MoveCallTransaction, this.txb));
    return moveCalls;
  }

  private get helperRedeems() {
    const moveCalls = this.transactions
      .filter(
        (trans) => trans.kind === 'MoveCall' && trans.target.startsWith(`${this.coreId.protocolPkg}::redeem::redeem`),
      )
      .map((trans) => new MoveCallHelper(trans as MoveCallTransaction, this.txb));
    return moveCalls;
  }

  private get helperRedeem() {
    const moveCall = this.transactions.find(
      (trans) => trans.kind === 'MoveCall' && trans.target.startsWith(`${this.coreId.protocolPkg}::redeem::redeem`),
    ) as MoveCallTransaction;
    return new MoveCallHelper(moveCall, this.txb);
  }

  private get helperStake() {
    const moveCall = this.transactions.find(
      (trans) => trans.kind === 'MoveCall' && trans.target.startsWith(`${this.coreId.spoolPkg}::user::stake`),
    ) as MoveCallTransaction;
    return new MoveCallHelper(moveCall, this.txb);
  }

  private get helperUnstake() {
    const moveCall = this.transactions.find(
      (trans) => trans.kind === 'MoveCall' && trans.target.startsWith(`${this.coreId.spoolPkg}::user::unstake`),
    ) as MoveCallTransaction;
    return new MoveCallHelper(moveCall, this.txb);
  }

  private get helperDepositCollateral() {
    const moveCall = this.transactions.find(
      (trans) =>
        trans.kind === 'MoveCall' &&
        trans.target.startsWith(`${this.coreId.protocolPkg}::deposit_collateral::deposit_collateral`),
    ) as MoveCallTransaction;
    return new MoveCallHelper(moveCall, this.txb);
  }

  private get helperWithdrawCollateral() {
    const moveCall = this.transactions.find(
      (trans) =>
        trans.kind === 'MoveCall' &&
        trans.target.startsWith(`${this.coreId.protocolPkg}::withdraw_collateral::withdraw_collateral`),
    ) as MoveCallTransaction;
    return new MoveCallHelper(moveCall, this.txb);
  }

  private get helperBorrow() {
    const moveCall = this.transactions.find(
      (trans) => trans.kind === 'MoveCall' && trans.target.startsWith(`${this.coreId.protocolPkg}::borrow::borrow`),
    ) as MoveCallTransaction;
    return new MoveCallHelper(moveCall, this.txb);
  }

  private get helperRepay() {
    const moveCall = this.transactions.find(
      (trans) => trans.kind === 'MoveCall' && trans.target.startsWith(`${this.coreId.protocolPkg}::repay::repay`),
    ) as MoveCallTransaction;
    return new MoveCallHelper(moveCall, this.txb);
  }
}

export class SplitCoinHelper {
  constructor(
    public readonly splitCoin: SplitCoinsTransaction,
    public readonly txb: TransactionBlock,
  ) {}

  getAmountInput() {
    return this.splitCoin.amounts
      .map((input) => {
        if (input.kind === 'Input') {
          return Number(MoveCallHelper.getPureInputValue<number>(input, 'u64'));
        }
        return undefined;
      })
      .filter((input) => input !== undefined);
  }

  static getPureInputValue<T>(input: TransactionBlockInput, bcsType: string) {
    if (input.type !== 'pure') {
      throw new Error('not pure argument');
    }
    if (typeof input.value === 'object' && 'Pure' in input.value) {
      const bcsNums = input.value.Pure;
      return bcs.de(bcsType, new Uint8Array(bcsNums)) as T;
    }
    return input.value as T;
  }
}

export class MoveCallHelper {
  constructor(
    public readonly moveCall: MoveCallTransaction,
    public readonly txb: TransactionBlock,
  ) {}

  decodeSharedObjectId(argIndex: number) {
    const input = this.getInputParam(argIndex);
    return MoveCallHelper.getSharedObjectId(input);
  }

  decodeOwnedObjectId(argIndex: number) {
    const input = this.getInputParam(argIndex);
    return MoveCallHelper.getOwnedObjectId(input);
  }

  decodeInputU64(argIndex: number) {
    const strVal = this.decodePureArg<string>(argIndex, 'u64');
    return Number(strVal);
  }

  decodeInputU8(argIndex: number) {
    const strVal = this.decodePureArg<string>(argIndex, 'u8');
    return Number(strVal);
  }

  decodeInputAddress(argIndex: number) {
    const input = this.decodePureArg<string>(argIndex, 'address');
    return normalizeSuiAddress(input);
  }

  decodeInputString(argIndex: number) {
    return this.decodePureArg<string>(argIndex, 'string');
  }

  decodeInputBool(argIndex: number) {
    return this.decodePureArg<boolean>(argIndex, 'bool');
  }

  decodePureArg<T>(argIndex: number, bcsType: string) {
    const input = this.getInputParam(argIndex);
    return MoveCallHelper.getPureInputValue<T>(input, bcsType);
  }

  getInputParam(argIndex: number) {
    const arg = this.moveCall.arguments[argIndex];
    if (arg.kind !== 'Input') {
      throw new Error('not input type');
    }
    return this.txb.blockData.inputs[arg.index];
  }

  getNestedInputParam<T>(argIndex: number) {
    const arg = this.moveCall.arguments[argIndex];
    if (arg.kind !== 'NestedResult') {
      throw new Error('not input type');
    }
    return this.txb.blockData.transactions[arg.index] as T;
  }

  isHaveNestedInput(argIndex: number) {
    const arg = this.moveCall.arguments[argIndex];
    return arg.kind === 'NestedResult';
  }

  static getPureInputValue<T>(input: TransactionBlockInput, bcsType: string) {
    if (input.type !== 'pure') {
      throw new Error('not pure argument');
    }
    if (typeof input.value === 'object' && 'Pure' in input.value) {
      const bcsNums = input.value.Pure;
      return bcs.de(bcsType, new Uint8Array(bcsNums)) as T;
    }
    return input.value as T;
  }

  static getOwnedObjectId(input: TransactionBlockInput) {
    if (input.type !== 'object') {
      throw new Error(`not object argument: ${JSON.stringify(input)}`);
    }
    if (typeof input.value === 'object') {
      if (!('Object' in input.value) || !('ImmOrOwned' in input.value.Object)) {
        throw new Error('not ImmOrOwned');
      }
      return normalizeSuiAddress(input.value.Object.ImmOrOwned.objectId as string);
    }
    return normalizeSuiAddress(input.value as string);
  }

  static getSharedObjectId(input: TransactionBlockInput) {
    if (input.type !== 'object') {
      throw new Error(`not object argument: ${JSON.stringify(input)}`);
    }
    if (typeof input.value !== 'object') {
      return normalizeSuiAddress(input.value as string);
    }
    if (!('Object' in input.value) || !('Shared' in input.value.Object)) {
      throw new Error('not Shared');
    }
    return normalizeSuiAddress(input.value.Object.Shared.objectId as string);
  }

  static getPureInput<T>(input: TransactionBlockInput, bcsType: string) {
    if (input.type !== 'pure') {
      throw new Error('not pure argument');
    }
    if (typeof input.value !== 'object') {
      return input.value as T;
    }
    if (!('Pure' in input.value)) {
      throw new Error('Pure not in value');
    }
    const bcsVal = input.value.Pure;
    return bcs.de(bcsType, new Uint8Array(bcsVal)) as T;
  }

  typeArg(index: number) {
    return normalizeStructTag(this.moveCall.typeArguments[index]);
  }

  txArg(index: number) {
    return this.moveCall.arguments[index];
  }
}
