/*
  Warnings:

  - Added the required column `rate_plan_id` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `room_type_id` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "property_status_enum" ADD VALUE 'rejected';

-- DropForeignKey
ALTER TABLE "booking_guests" DROP CONSTRAINT "fk_bg_booking";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "fk_booking_voucher";

-- DropForeignKey
ALTER TABLE "daily_rates" DROP CONSTRAINT "fk_dr_rp";

-- DropForeignKey
ALTER TABLE "partner_profiles" DROP CONSTRAINT "fk_partner_reviewer";

-- DropForeignKey
ALTER TABLE "promotions" DROP CONSTRAINT "fk_promo_partner";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "fk_property_reviewer";

-- DropForeignKey
ALTER TABLE "property_policies" DROP CONSTRAINT "fk_policy_prop";

-- DropForeignKey
ALTER TABLE "rate_plans" DROP CONSTRAINT "fk_rp_rt";

-- DropForeignKey
ALTER TABLE "room_type_amenities" DROP CONSTRAINT "fk_rta_amenity";

-- DropForeignKey
ALTER TABLE "room_type_amenities" DROP CONSTRAINT "fk_rta_rt";

-- DropForeignKey
ALTER TABLE "room_types" DROP CONSTRAINT "fk_rt_property";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "fk_room_property";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "fk_room_type";

-- DropForeignKey
ALTER TABLE "user_sessions" DROP CONSTRAINT "fk_session_user";

-- DropForeignKey
ALTER TABLE "vouchers" DROP CONSTRAINT "fk_voucher_promo";

-- DropIndex
DROP INDEX "idx_prop_search";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "rate_plan_id" BIGINT NOT NULL,
ADD COLUMN     "room_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "deleted_at" TIMESTAMP(6),
ALTER COLUMN "discount_value" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "deleted_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "room_types" ADD COLUMN     "deleted_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(6);

-- CreateTable
CREATE TABLE "reviews" (
    "id" BIGSERIAL NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "property_id" BIGINT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "overall_rating" DECIMAL(3,1) NOT NULL,
    "cleanliness_rating" DECIMAL(3,1),
    "service_rating" DECIMAL(3,1),
    "location_rating" DECIMAL(3,1),
    "value_rating" DECIMAL(3,1),
    "title" VARCHAR(255),
    "content" TEXT,
    "moderation_status" "moderation_status_enum" NOT NULL DEFAULT 'pending',
    "moderated_by" BIGINT,
    "moderated_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" BIGINT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_rev_booking" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "idx_review_property_status" ON "reviews"("property_id", "moderation_status", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_review_customer" ON "reviews"("customer_id");

-- CreateIndex
CREATE INDEX "idx_audit_actor" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "idx_audit_created" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_booking_customer_status" ON "bookings"("customer_id", "status");

-- CreateIndex
CREATE INDEX "idx_booking_property_dates" ON "bookings"("property_id", "check_in_date", "check_out_date");

-- CreateIndex
CREATE INDEX "idx_daily_rate_plan_date" ON "daily_rates"("rate_plan_id", "date");

-- CreateIndex
CREATE INDEX "idx_daily_rate_date_available" ON "daily_rates"("date", "available_qty");

-- CreateIndex
CREATE INDEX "idx_prop_search" ON "properties"("city", "status", "deleted_at");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "fk_property_reviewer" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "fk_rt_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_booking_rt" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_booking_rp" FOREIGN KEY ("rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_booking_voucher" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "fk_bg_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_rates" ADD CONSTRAINT "fk_dr_rp" FOREIGN KEY ("rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partner_profiles" ADD CONSTRAINT "fk_partner_reviewer" FOREIGN KEY ("kyc_reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "fk_promo_partner" FOREIGN KEY ("partner_id") REFERENCES "partner_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_policies" ADD CONSTRAINT "fk_policy_prop" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rate_plans" ADD CONSTRAINT "fk_rp_rt" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "fk_rta_amenity" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "fk_rta_rt" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "fk_room_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "fk_room_type" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "fk_session_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "fk_voucher_promo" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_rev_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_rev_cust" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_rev_mod" FOREIGN KEY ("moderated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_rev_prop" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
