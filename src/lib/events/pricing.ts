import { Prisma } from '@prisma/client';

export function calculatePromoterPrice(
  publicPrice: Prisma.Decimal | number | string,
  discountPercent: Prisma.Decimal | number | string,
) {
  const price = new Prisma.Decimal(publicPrice);
  const discount = new Prisma.Decimal(discountPercent);

  if (discount.lessThan(0) || discount.greaterThan(100)) {
    throw new Error('INVALID_PROMOTER_DISCOUNT');
  }

  return price.mul(new Prisma.Decimal(100).minus(discount)).div(100).toDecimalPlaces(2);
}

export function assertValidPromoterPricing(
  publicPrice: Prisma.Decimal | number | string,
  discountPercent: Prisma.Decimal | number | string,
) {
  const price = new Prisma.Decimal(publicPrice);
  if (price.lessThan(0)) throw new Error('INVALID_PUBLIC_TICKET_PRICE');
  return calculatePromoterPrice(price, discountPercent);
}
