UPDATE "wk_top_hammer_bits"
SET "指导价USD" = CEIL("成本CNY" * 2.2 * 1.2 / 7.0)
WHERE "Product Code" ILIKE '%001dth%'
  AND "Description" ILIKE '%bit%';
