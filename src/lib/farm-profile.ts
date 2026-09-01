export type FarmProfile = {
  name: string;
  location: string;
  owner: string;
  currency: string;
  totalPonds: number | null;
  totalStockKg: number | null;
  cageNames?: string[];
};
