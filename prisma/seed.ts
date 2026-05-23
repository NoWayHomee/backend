import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Amenities ───────────────────────────────────────────────────────────
  const amenityData = [
    { name: 'Free Wi-Fi', category: 'connectivity', iconCode: 'wifi' },
    { name: 'Swimming Pool', category: 'recreation', iconCode: 'pool' },
    { name: 'Air Conditioning', category: 'comfort', iconCode: 'ac' },
    { name: 'Free Parking', category: 'transport', iconCode: 'parking' },
    { name: 'Restaurant', category: 'dining', iconCode: 'restaurant' },
    { name: 'Fitness Center', category: 'recreation', iconCode: 'gym' },
    { name: '24-Hour Front Desk', category: 'service', iconCode: 'desk' },
  ];

  const amenities = await Promise.all(
    amenityData.map((a) =>
      prisma.amenity.upsert({
        where: { name: a.name },
        update: { isActive: true },
        create: { name: a.name, category: a.category, iconCode: a.iconCode, isActive: true },
      }),
    ),
  );
  console.log(`Upserted ${amenities.length} amenities`);

  // ─── Users ────────────────────────────────────────────────────────────────
  const passwordHash = bcrypt.hashSync('Password123', 10);
  const now = new Date();

  const admin = await prisma.user.upsert({
    where: { email: 'admin@daapp.vn' },
    update: {},
    create: {
      email: 'admin@daapp.vn',
      passwordHash,
      fullName: 'System Admin',
      userType: 'admin',
      status: 'active',
      emailVerifiedAt: now,
      preferredLanguage: 'vi',
    },
  });

  const partner = await prisma.user.upsert({
    where: { email: 'partner@daapp.vn' },
    update: {},
    create: {
      email: 'partner@daapp.vn',
      passwordHash,
      fullName: 'Nguyen Van Partner',
      userType: 'partner',
      status: 'active',
      emailVerifiedAt: now,
      preferredLanguage: 'vi',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@daapp.vn' },
    update: {},
    create: {
      email: 'customer@daapp.vn',
      passwordHash,
      fullName: 'Tran Thi Customer',
      userType: 'customer',
      status: 'active',
      emailVerifiedAt: now,
      preferredLanguage: 'vi',
    },
  });

  console.log(`Users: admin=${admin.id}, partner=${partner.id}, customer=${customer.id}`);

  // ─── Customer Profile ─────────────────────────────────────────────────────
  await prisma.customerProfile.upsert({
    where: { userId: customer.id },
    update: {},
    create: {
      userId: customer.id,
      loyaltyTier: 'member',
      loyaltyPointsBalance: 0,
      totalBookings: 0,
    },
  });

  // ─── Partner Profile ──────────────────────────────────────────────────────
  const partnerProfile = await prisma.partnerProfile.upsert({
    where: { userId: partner.id },
    update: {},
    create: {
      userId: partner.id,
      businessName: 'Hanoi Luxury Hotels Co.',
      businessType: 'company',
      taxCode: '0123456789',
      kycStatus: 'approved',
      kycReviewerId: admin.id,
      kycReviewedAt: now,
      bankAccountName: 'NGUYEN VAN PARTNER',
      bankAccountNumber: '9999888877776666',
      bankName: 'Vietcombank',
      commissionTier: 'standard',
    },
  });
  console.log(`PartnerProfile id=${partnerProfile.id}`);

  // ─── Property ─────────────────────────────────────────────────────────────
  const property = await prisma.property.upsert({
    where: { slug: 'hanoi-luxury-hotel-seed' },
    update: { status: 'active' },
    create: {
      partnerId: partnerProfile.id,
      slug: 'hanoi-luxury-hotel-seed',
      name: 'Hanoi Luxury Hotel',
      propertyType: 'hotel',
      description: 'A luxury hotel in the heart of Hanoi, seed data.',
      address: '1 Pho Co Hanoi, Hoan Kiem District',
      city: 'Hanoi',
      district: 'Hoan Kiem',
      countryCode: 'VN',
      latitude: new Prisma.Decimal('21.02780000'),
      longitude: new Prisma.Decimal('105.83416000'),
      starRating: 4,
      avgRating: new Prisma.Decimal('0.00'),
      status: 'active',
      reviewerId: admin.id,
      reviewedAt: now,
    },
  });
  console.log(`Property id=${property.id}`);

  // ─── Property Amenities ───────────────────────────────────────────────────
  for (const amenity of amenities) {
    await prisma.propertyAmenity.upsert({
      where: { propertyId_amenityId: { propertyId: property.id, amenityId: amenity.id } },
      update: {},
      create: { propertyId: property.id, amenityId: amenity.id },
    });
  }

  // ─── Property Policy ──────────────────────────────────────────────────────
  await prisma.propertyPolicy.upsert({
    where: { propertyId: property.id },
    update: {},
    create: {
      propertyId: property.id,
      cancellationType: 'flexible',
      freeCancelHours: 24,
      cancelPenaltyPercent: new Prisma.Decimal('0.00'),
      minStayNights: 1,
      instantConfirmation: true,
      breakfastIncluded: false,
      parkingType: 'free',
      petsAllowed: false,
      smokingAllowed: false,
      childrenAllowed: true,
    },
  });

  // ─── Room Type ────────────────────────────────────────────────────────────
  const ROOM_BASE_PRICE = '850000.00';
  const TOTAL_ROOMS = 10;

  const roomType = await prisma.roomType.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      propertyId: property.id,
      name: 'Deluxe Double Room',
      description: 'Spacious deluxe room with city view and king-size bed.',
      areaSqm: new Prisma.Decimal('32.00'),
      bedConfiguration: '1 King Bed',
      maxOccupancy: 2,
      viewType: 'City View',
      totalRooms: TOTAL_ROOMS,
      basePrice: new Prisma.Decimal(ROOM_BASE_PRICE),
      isActive: true,
    },
  });
  console.log(`RoomType id=${roomType.id}`);

  // Link room type amenities
  for (const amenity of amenities.slice(0, 5)) {
    await prisma.roomTypeAmenity.upsert({
      where: { roomTypeId_amenityId: { roomTypeId: roomType.id, amenityId: amenity.id } },
      update: {},
      create: { roomTypeId: roomType.id, amenityId: amenity.id },
    });
  }

  // ─── Rate Plan ────────────────────────────────────────────────────────────
  const ratePlan = await prisma.ratePlan.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      roomTypeId: roomType.id,
      name: 'Standard Rate',
      mealPlan: 'room_only',
      refundable: true,
      basePrice: new Prisma.Decimal(ROOM_BASE_PRICE),
      isActive: true,
    },
  });
  console.log(`RatePlan id=${ratePlan.id}`);

  // ─── Daily Rates (today → today+30) ──────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dailyCount = 0;
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    // Strip time component so Prisma sends a pure date
    const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

    await prisma.dailyRate.upsert({
      where: { ratePlanId_date: { ratePlanId: ratePlan.id, date: dateOnly } },
      update: { price: new Prisma.Decimal(ROOM_BASE_PRICE), availableQty: TOTAL_ROOMS },
      create: {
        ratePlanId: ratePlan.id,
        date: dateOnly,
        price: new Prisma.Decimal(ROOM_BASE_PRICE),
        availableQty: TOTAL_ROOMS,
        minStay: 1,
      },
    });
    dailyCount++;
  }
  console.log(`Created/updated ${dailyCount} DailyRate rows`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());