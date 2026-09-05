-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    INDEX `role_permissions_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `birthday` DATE NULL,
    `dateHired` DATE NULL,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    INDEX `users_roleId_idx`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `scheduleDate` DATE NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `employee_schedules_userId_idx`(`userId`),
    UNIQUE INDEX `employee_schedules_scheduleDate_userId_key`(`scheduleDate`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_payroll_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dailyRate` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `scheduleStartMinutes` INTEGER NOT NULL DEFAULT 600,
    `scheduleEndMinutes` INTEGER NOT NULL DEFAULT 1200,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employee_payroll_profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `attendanceDate` DATE NOT NULL,
    `timeIn` DATETIME(3) NULL,
    `timeOut` DATETIME(3) NULL,
    `lateMinutes` INTEGER NOT NULL DEFAULT 0,
    `undertimeMinutes` INTEGER NOT NULL DEFAULT 0,
    `sourceFile` TEXT NULL,
    `rawEmployeeCode` VARCHAR(191) NULL,
    `importedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `attendance_logs_attendanceDate_idx`(`attendanceDate`),
    INDEX `attendance_logs_importedById_idx`(`importedById`),
    UNIQUE INDEX `attendance_logs_userId_attendanceDate_key`(`userId`, `attendanceDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `remarks` TEXT NULL,
    `receiptUrl` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `expenses_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_entries` (
    `id` VARCHAR(191) NOT NULL,
    `entryType` VARCHAR(191) NOT NULL,
    `businessDate` DATE NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `remarks` TEXT NULL,
    `receiptUrl` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bank_entries_entryType_idx`(`entryType`),
    INDEX `bank_entries_businessDate_idx`(`businessDate`),
    INDEX `bank_entries_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_cash_summaries` (
    `id` VARCHAR(191) NOT NULL,
    `businessDate` DATE NOT NULL,
    `startingAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `adjustments` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `cashOnHand` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `openingCashForTomorrow` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `updatedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_cash_summaries_businessDate_key`(`businessDate`),
    INDEX `daily_cash_summaries_createdById_idx`(`createdById`),
    INDEX `daily_cash_summaries_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_cash_adjustments` (
    `id` VARCHAR(191) NOT NULL,
    `summaryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `daily_cash_adjustments_summaryId_idx`(`summaryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_pos_reports` (
    `id` VARCHAR(191) NOT NULL,
    `businessDate` DATE NOT NULL,
    `grossSales` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `deliveryFeeTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `netSales` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `cashTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `cardTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `otherTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gcashTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `receiptCount` INTEGER NOT NULL DEFAULT 0,
    `paymentCount` INTEGER NOT NULL DEFAULT 0,
    `paymentBreakdown` JSON NOT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_pos_reports_businessDate_key`(`businessDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_gcash_sales` (
    `id` VARCHAR(191) NOT NULL,
    `businessDate` DATE NOT NULL,
    `gcashTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_gcash_sales_businessDate_key`(`businessDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gcash_entries` (
    `id` VARCHAR(191) NOT NULL,
    `entryType` VARCHAR(191) NOT NULL,
    `businessDate` DATE NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `remarks` TEXT NULL,
    `receiptUrl` TEXT NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `gcash_entries_entryType_idx`(`entryType`),
    INDEX `gcash_entries_businessDate_idx`(`businessDate`),
    INDEX `gcash_entries_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_orders` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `orderType` VARCHAR(191) NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL DEFAULT 'cash',
    `customerNote` TEXT NULL,
    `scheduledFor` DATETIME(3) NOT NULL,
    `deliveryAddress` TEXT NULL,
    `deliveryLatitude` DECIMAL(10, 7) NULL,
    `deliveryLongitude` DECIMAL(10, 7) NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `loyverseReceiptNumber` VARCHAR(191) NULL,
    `loyverseSyncedAt` DATETIME(3) NULL,
    `loyverseSyncError` TEXT NULL,
    `loyverseSentById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_orders_orderNumber_key`(`orderNumber`),
    UNIQUE INDEX `customer_orders_loyverseReceiptNumber_key`(`loyverseReceiptNumber`),
    INDEX `customer_orders_customerId_idx`(`customerId`),
    INDEX `customer_orders_loyverseSentById_idx`(`loyverseSentById`),
    INDEX `customer_orders_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `birthday` DATE NULL,
    `passwordHash` TEXT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `verificationTokenHash` VARCHAR(191) NULL,
    `verificationTokenExpiresAt` DATETIME(3) NULL,
    `googleId` VARCHAR(191) NULL,
    `facebookId` VARCHAR(191) NULL,
    `loyaltyCode` VARCHAR(191) NOT NULL,
    `loyaltyPoints` INTEGER NOT NULL DEFAULT 0,
    `lifetimePoints` INTEGER NOT NULL DEFAULT 0,
    `redeemedPoints` INTEGER NOT NULL DEFAULT 0,
    `pendingStampAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `lastOrderAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customers_phoneNumber_key`(`phoneNumber`),
    UNIQUE INDEX `customers_email_key`(`email`),
    UNIQUE INDEX `customers_verificationTokenHash_key`(`verificationTokenHash`),
    UNIQUE INDEX `customers_googleId_key`(`googleId`),
    UNIQUE INDEX `customers_facebookId_key`(`facebookId`),
    UNIQUE INDEX `customers_loyaltyCode_key`(`loyaltyCode`),
    INDEX `customers_displayName_idx`(`displayName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyalty_rewards` (
    `id` VARCHAR(191) NOT NULL,
    `stampsRequired` INTEGER NOT NULL,
    `rewardName` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loyalty_rewards_stampsRequired_key`(`stampsRequired`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyalty_reward_claims` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `rewardId` VARCHAR(191) NOT NULL,
    `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `loyalty_reward_claims_rewardId_idx`(`rewardId`),
    UNIQUE INDEX `loyalty_reward_claims_customerId_rewardId_key`(`customerId`, `rewardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyalty_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `spendPerStamp` DECIMAL(12, 2) NOT NULL DEFAULT 200,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyalty_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL,
    `balanceAfter` INTEGER NOT NULL,
    `rewardName` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `loyalty_transactions_customerId_idx`(`customerId`),
    INDEX `loyalty_transactions_orderId_idx`(`orderId`),
    INDEX `loyalty_transactions_createdById_idx`(`createdById`),
    INDEX `loyalty_transactions_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `imageUrl` TEXT NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `isBestSeller` BOOLEAN NOT NULL DEFAULT false,
    `isSpicy` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `menu_products_category_idx`(`category`),
    INDEX `menu_products_isAvailable_idx`(`isAvailable`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_order_items` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lineTotal` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_order_items_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
