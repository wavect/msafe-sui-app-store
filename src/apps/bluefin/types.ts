import { SuiAddress, TransactionType } from '@msafe/sui3-utils';

export type SuiNetworks = 'sui:devnet' | 'sui:testnet' | 'sui:localnet' | 'sui:mainnet';

export type FeeTokens = [string, string];
export type RewardTokens = Array<string>;

export type CollectTokens = {
  collectFeeTokens: FeeTokens;
  collectRewardTokens: RewardTokens;
};

export type OpenPositionIntentionData = {
  pool: SuiAddress;
  lowerTick: number;
  upperTick: number;
  tokenAmount: string;
  maxAmountTokenA: string;
  maxAmountTokenB: string;
  isTokenAFixed: boolean;
};

export type ClosePositionIntentionData = {
  pool: SuiAddress;
  position: SuiAddress;
  transferTokensTo?: SuiAddress;
} & CollectTokens;

export type ProvideLiquidityIntentionData = {
  pool: SuiAddress;
  position: SuiAddress;
  lowerTick: number;
  upperTick: number;
  tokenAmount: string;
  maxAmountTokenA: string;
  maxAmountTokenB: string;
  isTokenAFixed: boolean;
};

export type RemoveLiquidityIntentionData = {
  pool: SuiAddress;
  position: SuiAddress;
  liquidity: string;
  maxAmountTokenA: string;
  maxAmountTokenB: string;
  transferTokensTo?: SuiAddress;
} & CollectTokens;

export type CollectRewardsAndFeeIntentionData = {
  pool: SuiAddress;
  position: SuiAddress;
} & CollectTokens;

export type CollectRewardsIntentionData = {
  pool: SuiAddress;
  position: SuiAddress;
  collectRewardTokens: RewardTokens;
};

export type CollectFeeIntentionData = {
  pool: SuiAddress;
  position: SuiAddress;
  collectFeeTokens: FeeTokens;
};

export type BluefinIntentionData =
  | OpenPositionIntentionData
  | ClosePositionIntentionData
  | ProvideLiquidityIntentionData
  | RemoveLiquidityIntentionData
  | CollectRewardsIntentionData
  | CollectFeeIntentionData
  | CollectRewardsAndFeeIntentionData;

export type DecodeResult = {
  txType: TransactionType;
  type: TransactionSubType;
  intentionData: BluefinIntentionData;
};

export type RewardCollection = {
  position: SuiAddress;
  pool: SuiAddress;
  rewardCoinType: string;
};

export enum TransactionSubType {
  OpenPosition = 'OpenPosition',
  ClosePosition = 'ClosePosition',
  ProvideLiquidity = 'ProvideLiquidity',
  RemoveLiquidity = 'RemoveLiquidity',
  CollectFee = 'CollectFee',
  CollectRewards = 'CollectRewards',
  CollectRewardsAndFee = 'CollectRewardsAndFee',
}
