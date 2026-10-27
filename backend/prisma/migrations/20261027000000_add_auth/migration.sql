-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'MERCHANT');

-- Existing rows (demo users from the first release) have no password, so they
-- cannot log in. Give them an unusable placeholder hash; `npm run seed`
-- recreates real demo accounts.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '!';
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'CUSTOMER';
