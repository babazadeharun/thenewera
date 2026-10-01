-- Additive portfolio media categories for the public agency portfolio.
ALTER TYPE "MediaCategory" ADD VALUE IF NOT EXISTS 'PORTFOLIO_VIDEO';
ALTER TYPE "MediaCategory" ADD VALUE IF NOT EXISTS 'PORTFOLIO_DESIGN';
ALTER TYPE "MediaCategory" ADD VALUE IF NOT EXISTS 'PARTNER_LOGO';
