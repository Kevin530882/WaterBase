-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: waterbasebackend
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `badges`
--

DROP TABLE IF EXISTS `badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `badges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `icon_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('auto','manual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `criteria` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `badges`
--

LOCK TABLES `badges` WRITE;
/*!40000 ALTER TABLE `badges` DISABLE KEYS */;
/*!40000 ALTER TABLE `badges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_activity_logs`
--

DROP TABLE IF EXISTS `device_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_activity_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `event_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `device_activity_logs_user_id_foreign` (`user_id`),
  KEY `device_activity_logs_device_id_created_at_index` (`device_id`,`created_at`),
  KEY `device_activity_logs_event_type_index` (`event_type`),
  CONSTRAINT `device_activity_logs_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `device_activity_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_activity_logs`
--

LOCK TABLES `device_activity_logs` WRITE;
/*!40000 ALTER TABLE `device_activity_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_maintenance_logs`
--

DROP TABLE IF EXISTS `device_maintenance_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_maintenance_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint unsigned NOT NULL,
  `performed_by_user_id` bigint unsigned DEFAULT NULL,
  `maintenance_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `performed_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `device_maintenance_logs_device_id_foreign` (`device_id`),
  KEY `device_maintenance_logs_performed_by_user_id_foreign` (`performed_by_user_id`),
  CONSTRAINT `device_maintenance_logs_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `device_maintenance_logs_performed_by_user_id_foreign` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_maintenance_logs`
--

LOCK TABLES `device_maintenance_logs` WRITE;
/*!40000 ALTER TABLE `device_maintenance_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_maintenance_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_maintenance_schedules`
--

DROP TABLE IF EXISTS `device_maintenance_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_maintenance_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint unsigned NOT NULL,
  `calibration_interval_days` int NOT NULL DEFAULT '30',
  `reminder_days_before` int NOT NULL DEFAULT '14',
  `last_calibrated_at` timestamp NULL DEFAULT NULL,
  `next_due_at` timestamp NULL DEFAULT NULL,
  `reminder_sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `device_maintenance_schedules_device_id_foreign` (`device_id`),
  CONSTRAINT `device_maintenance_schedules_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_maintenance_schedules`
--

LOCK TABLES `device_maintenance_schedules` WRITE;
/*!40000 ALTER TABLE `device_maintenance_schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_maintenance_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_telemetries`
--

DROP TABLE IF EXISTS `device_telemetries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_telemetries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint unsigned NOT NULL,
  `recorded_at` timestamp NOT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `reading_timestamp_ms` bigint unsigned DEFAULT NULL COMMENT 'Device milliseconds when sensor was read (boot time)',
  `latency_ms` bigint unsigned DEFAULT NULL COMMENT 'Calculated: received_at - recorded_at in milliseconds',
  `temperature_celsius` decimal(8,2) DEFAULT NULL,
  `ph` decimal(6,2) DEFAULT NULL,
  `turbidity_ntu` decimal(10,2) DEFAULT NULL,
  `tds_mg_l` decimal(10,2) DEFAULT NULL,
  `water_level_cm` decimal(10,2) DEFAULT NULL,
  `raw_payload` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `device_telemetries_device_id_recorded_at_index` (`device_id`,`recorded_at`),
  KEY `idx_device_latency` (`device_id`,`latency_ms`),
  KEY `idx_latency_performance` (`latency_ms`),
  CONSTRAINT `device_telemetries_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_telemetries`
--

LOCK TABLES `device_telemetries` WRITE;
/*!40000 ALTER TABLE `device_telemetries` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_telemetries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `devices`
--

DROP TABLE IF EXISTS `devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mac_address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `station_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'awaiting_pair',
  `paired_by_user_id` bigint unsigned DEFAULT NULL,
  `paired_at` timestamp NULL DEFAULT NULL,
  `discovery_last_seen_at` timestamp NULL DEFAULT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `firmware_version` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hardware_revision` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raw_discovery_payload` json DEFAULT NULL,
  `latitude` decimal(11,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `environment_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'freshwater',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `devices_mac_address_unique` (`mac_address`),
  UNIQUE KEY `devices_station_id_unique` (`station_id`),
  KEY `devices_paired_by_user_id_foreign` (`paired_by_user_id`),
  KEY `devices_status_discovery_last_seen_at_index` (`status`,`discovery_last_seen_at`),
  KEY `devices_status_last_seen_at_index` (`status`,`last_seen_at`),
  CONSTRAINT `devices_paired_by_user_id_foreign` FOREIGN KEY (`paired_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `devices`
--

LOCK TABLES `devices` WRITE;
/*!40000 ALTER TABLE `devices` DISABLE KEYS */;
/*!40000 ALTER TABLE `devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_user`
--

DROP TABLE IF EXISTS `event_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_user` (
  `user_id` bigint unsigned NOT NULL,
  `event_id` bigint unsigned NOT NULL,
  `joined_at` timestamp NULL DEFAULT NULL,
  `is_present` tinyint(1) NOT NULL DEFAULT '0',
  `qr_scanned_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`,`event_id`),
  KEY `event_user_event_id_foreign` (`event_id`),
  CONSTRAINT `event_user_event_id_foreign` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_user`
--

LOCK TABLES `event_user` WRITE;
/*!40000 ALTER TABLE `event_user` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(11,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `duration` decimal(3,1) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `maxVolunteers` int NOT NULL,
  `currentVolunteers` int NOT NULL DEFAULT '0',
  `points` int NOT NULL,
  `badge` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('recruiting','active','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'recruiting',
  `started_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `report_group_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `events_user_id_foreign` (`user_id`),
  KEY `events_report_group_id_foreign` (`report_group_id`),
  CONSTRAINT `events_report_group_id_foreign` FOREIGN KEY (`report_group_id`) REFERENCES `report_groups` (`id`),
  CONSTRAINT `events_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `metrics_daily`
--

DROP TABLE IF EXISTS `metrics_daily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `metrics_daily` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint unsigned NOT NULL,
  `date` date NOT NULL,
  `avg_ph` decimal(6,2) DEFAULT NULL,
  `avg_tds_mg_l` decimal(10,2) DEFAULT NULL,
  `avg_turbidity_ntu` decimal(10,2) DEFAULT NULL,
  `avg_temp_celsius` decimal(8,2) DEFAULT NULL,
  `min_ph` decimal(6,2) DEFAULT NULL,
  `max_ph` decimal(6,2) DEFAULT NULL,
  `min_tds_mg_l` decimal(10,2) DEFAULT NULL,
  `max_tds_mg_l` decimal(10,2) DEFAULT NULL,
  `min_turbidity_ntu` decimal(10,2) DEFAULT NULL,
  `max_turbidity_ntu` decimal(10,2) DEFAULT NULL,
  `reading_count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `metrics_daily_device_id_date_unique` (`device_id`,`date`),
  CONSTRAINT `metrics_daily_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `metrics_daily`
--

LOCK TABLES `metrics_daily` WRITE;
/*!40000 ALTER TABLE `metrics_daily` DISABLE KEYS */;
/*!40000 ALTER TABLE `metrics_daily` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `metrics_monthly`
--

DROP TABLE IF EXISTS `metrics_monthly`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `metrics_monthly` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint unsigned NOT NULL,
  `year_month` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avg_ph` decimal(6,2) DEFAULT NULL,
  `avg_tds_mg_l` decimal(10,2) DEFAULT NULL,
  `avg_turbidity_ntu` decimal(10,2) DEFAULT NULL,
  `avg_temp_celsius` decimal(8,2) DEFAULT NULL,
  `min_ph` decimal(6,2) DEFAULT NULL,
  `max_ph` decimal(6,2) DEFAULT NULL,
  `min_tds_mg_l` decimal(10,2) DEFAULT NULL,
  `max_tds_mg_l` decimal(10,2) DEFAULT NULL,
  `min_turbidity_ntu` decimal(10,2) DEFAULT NULL,
  `max_turbidity_ntu` decimal(10,2) DEFAULT NULL,
  `reading_count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `metrics_monthly_device_id_year_month_unique` (`device_id`,`year_month`),
  CONSTRAINT `metrics_monthly_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `metrics_monthly`
--

LOCK TABLES `metrics_monthly` WRITE;
/*!40000 ALTER TABLE `metrics_monthly` DISABLE KEYS */;
/*!40000 ALTER TABLE `metrics_monthly` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'2024_04_20_000000_add_profile_photo_to_users',1),(3,'2025_07_08_023508_create_reports_table',1),(4,'2025_07_08_024630_create_events_table',1),(5,'2025_07_22_122914_create_event_user_table',1),(6,'2025_07_23_114700_create_personal_access_tokens_table',1),(7,'2025_07_30_071812_create_report_groups_table',1),(8,'2025_07_30_072059_add_report_group_id_to_events_table',1),(9,'2025_07_30_090819_add_ai_confidence_column',1),(10,'2025_07_31_130725_create_cache_table',1),(11,'2025_08_01_061228_add_geographic_columns_to_users_table',1),(12,'2025_08_01_105556_add_ai_annotated_image_to_reports_table',1),(13,'2025_08_02_154554_add_admin_notes_for_reports',1),(14,'2025_08_02_171051_add_verified_at_for_reports_table',1),(15,'2025_08_09_133227_add_report_group_id_to_reports_table',1),(16,'2025_08_11_000000_create_system_settings_table',1),(17,'2026_04_20_000001_create_organization_followers_table',1),(18,'2026_04_20_000002_create_organization_memberships_table',1),(19,'2026_04_20_000003_create_organization_join_requests_table',1),(20,'2026_04_20_000004_create_organization_updates_table',1),(21,'2026_04_20_000005_create_organization_settings_table',1),(22,'2026_04_23_000001_create_user_notifications_table',1),(23,'2026_04_23_000002_create_failed_jobs_table',1),(24,'2026_04_23_064001_create_jobs_table',1),(25,'2026_04_27_000003_add_push_token_fields_to_users_table',1),(26,'2026_04_27_000004_add_push_preferences_to_users_table',1),(27,'2026_04_27_000005_add_auto_approved_to_reports_table',1),(28,'2026_04_27_000006_add_info_requested_status_to_reports',1),(29,'2026_04_27_000007_create_badges_table',1),(30,'2026_04_27_000008_add_organization_proof_to_users_table',1),(31,'2026_05_01_000001_add_water_quality_columns_to_reports',1),(32,'2026_05_01_000002_add_csv_auto_approve_to_system_settings',1),(33,'2026_05_01_000003_create_research_documents_table',1),(34,'2026_05_02_110133_add_attendance_to_event_user',1),(35,'2026_05_02_110134_add_timing_to_events',1),(36,'2026_05_02_110135_add_event_id_to_reports',1),(37,'2026_05_02_120136_add_approval_status_to_users_table',1),(38,'2026_05_05_000001_create_devices_table',1),(39,'2026_05_05_000002_create_device_telemetries_table',1),(40,'2026_05_05_000003_add_location_to_devices',1),(41,'2026_05_05_000003_add_performance_tracking_to_device_telemetries',1),(42,'2026_05_05_000004_create_device_maintenance_schedules_table',1),(43,'2026_05_05_000005_create_device_maintenance_logs_table',1),(44,'2026_05_05_000006_create_metrics_daily_table',1),(45,'2026_05_05_000007_create_metrics_monthly_table',1),(46,'2026_05_05_000008_create_device_activity_logs_table',1),(47,'2026_05_05_000009_add_reminder_days_to_maintenance_schedules',1),(48,'2026_05_05_000010_add_received_at_to_device_telemetries',1),(49,'2026_05_08_000001_add_environment_type_to_devices_table',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_followers`
--

DROP TABLE IF EXISTS `organization_followers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_followers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `follower_user_id` bigint unsigned NOT NULL,
  `organization_user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_followers_unique` (`follower_user_id`,`organization_user_id`),
  KEY `organization_followers_organization_user_id_foreign` (`organization_user_id`),
  CONSTRAINT `organization_followers_follower_user_id_foreign` FOREIGN KEY (`follower_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organization_followers_organization_user_id_foreign` FOREIGN KEY (`organization_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_followers`
--

LOCK TABLES `organization_followers` WRITE;
/*!40000 ALTER TABLE `organization_followers` DISABLE KEYS */;
/*!40000 ALTER TABLE `organization_followers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_join_requests`
--

DROP TABLE IF EXISTS `organization_join_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_join_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `requester_user_id` bigint unsigned NOT NULL,
  `organization_user_id` bigint unsigned NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `message` text COLLATE utf8mb4_unicode_ci,
  `reviewed_by_user_id` bigint unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `organization_join_requests_reviewed_by_user_id_foreign` (`reviewed_by_user_id`),
  KEY `org_join_requests_org_status_idx` (`organization_user_id`,`status`),
  KEY `org_join_requests_requester_status_idx` (`requester_user_id`,`status`),
  CONSTRAINT `organization_join_requests_organization_user_id_foreign` FOREIGN KEY (`organization_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organization_join_requests_requester_user_id_foreign` FOREIGN KEY (`requester_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organization_join_requests_reviewed_by_user_id_foreign` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_join_requests`
--

LOCK TABLES `organization_join_requests` WRITE;
/*!40000 ALTER TABLE `organization_join_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `organization_join_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_memberships`
--

DROP TABLE IF EXISTS `organization_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_memberships` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `organization_user_id` bigint unsigned NOT NULL,
  `joined_via` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `joined_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_memberships_unique` (`user_id`,`organization_user_id`),
  KEY `organization_memberships_organization_user_id_foreign` (`organization_user_id`),
  CONSTRAINT `organization_memberships_organization_user_id_foreign` FOREIGN KEY (`organization_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organization_memberships_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_memberships`
--

LOCK TABLES `organization_memberships` WRITE;
/*!40000 ALTER TABLE `organization_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `organization_memberships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_settings`
--

DROP TABLE IF EXISTS `organization_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_user_id` bigint unsigned NOT NULL,
  `auto_accept_join_requests` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_settings_org_unique` (`organization_user_id`),
  CONSTRAINT `organization_settings_organization_user_id_foreign` FOREIGN KEY (`organization_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_settings`
--

LOCK TABLES `organization_settings` WRITE;
/*!40000 ALTER TABLE `organization_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `organization_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_updates`
--

DROP TABLE IF EXISTS `organization_updates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_updates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_user_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `update_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'update',
  `is_published` tinyint(1) NOT NULL DEFAULT '1',
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `org_updates_org_published_idx` (`organization_user_id`,`published_at`),
  CONSTRAINT `organization_updates_organization_user_id_foreign` FOREIGN KEY (`organization_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_updates`
--

LOCK TABLES `organization_updates` WRITE;
/*!40000 ALTER TABLE `organization_updates` DISABLE KEYS */;
/*!40000 ALTER TABLE `organization_updates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (1,'App\\Models\\User',5,'auth_token','c78c7eee4504379ca537bb63cebc57d30b11ab3a5d1b9db7b54892ad7b510a19','[\"*\"]','2026-05-08 05:57:20',NULL,'2026-05-08 05:48:05','2026-05-08 05:57:20');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report_groups`
--

DROP TABLE IF EXISTS `report_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `center_latitude` decimal(11,8) NOT NULL,
  `center_longitude` decimal(11,8) NOT NULL,
  `radius_meters` decimal(8,2) NOT NULL DEFAULT '50.00',
  `first_report_at` timestamp NOT NULL,
  `last_report_at` timestamp NOT NULL,
  `cleanup_event_id` bigint unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `report_count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `report_groups_cleanup_event_id_foreign` (`cleanup_event_id`),
  KEY `report_groups_center_latitude_center_longitude_index` (`center_latitude`,`center_longitude`),
  KEY `report_groups_is_active_cleanup_event_id_index` (`is_active`,`cleanup_event_id`),
  CONSTRAINT `report_groups_cleanup_event_id_foreign` FOREIGN KEY (`cleanup_event_id`) REFERENCES `events` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report_groups`
--

LOCK TABLES `report_groups` WRITE;
/*!40000 ALTER TABLE `report_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `report_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(11,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `pollutionType` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','verified','resolved','declined','info_requested') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `image` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `severityByUser` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci NOT NULL,
  `severityByAI` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'low',
  `ai_confidence` decimal(5,2) NOT NULL DEFAULT '0.00',
  `severityPercentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `water_body_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `temperature_celsius` decimal(5,2) DEFAULT NULL,
  `ph_level` decimal(4,2) DEFAULT NULL,
  `turbidity_ntu` decimal(8,2) DEFAULT NULL,
  `total_dissolved_solids_mgl` decimal(8,2) DEFAULT NULL,
  `sampling_date` date DEFAULT NULL,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'app',
  `ai_verified` tinyint(1) NOT NULL DEFAULT '0',
  `auto_approved` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Tracks if report was automatically approved based on AI confidence and system settings',
  `auto_approved_at` timestamp NULL DEFAULT NULL COMMENT 'Timestamp when auto-approval occurred',
  `user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `ai_annotated_image` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `verifiedBy` bigint unsigned DEFAULT NULL,
  `admin_notes` text COLLATE utf8mb4_unicode_ci,
  `verified_at` timestamp NULL DEFAULT NULL,
  `report_group_id` bigint unsigned DEFAULT NULL,
  `event_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reports_user_id_foreign` (`user_id`),
  KEY `reports_verifiedby_foreign` (`verifiedBy`),
  KEY `reports_report_group_id_foreign` (`report_group_id`),
  KEY `reports_event_id_foreign` (`event_id`),
  CONSTRAINT `reports_event_id_foreign` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reports_report_group_id_foreign` FOREIGN KEY (`report_group_id`) REFERENCES `report_groups` (`id`),
  CONSTRAINT `reports_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reports_verifiedby_foreign` FOREIGN KEY (`verifiedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `research_documents`
--

DROP TABLE IF EXISTS `research_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `research_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `research_documents_user_id_foreign` (`user_id`),
  CONSTRAINT `research_documents_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `research_documents`
--

LOCK TABLES `research_documents` WRITE;
/*!40000 ALTER TABLE `research_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `research_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `auto_approve_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `auto_approve_threshold` tinyint unsigned NOT NULL DEFAULT '80',
  `csv_auto_approve_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,0,80,0,'2026-05-08 05:48:07','2026-05-08 05:48:07');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_badges`
--

DROP TABLE IF EXISTS `user_badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_badges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `badge_id` bigint unsigned NOT NULL,
  `earned_at` timestamp NULL DEFAULT NULL,
  `issued_at` timestamp NULL DEFAULT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_badges_user_id_badge_id_unique` (`user_id`,`badge_id`),
  KEY `user_badges_badge_id_foreign` (`badge_id`),
  CONSTRAINT `user_badges_badge_id_foreign` FOREIGN KEY (`badge_id`) REFERENCES `badges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_badges_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_badges`
--

LOCK TABLES `user_badges` WRITE;
/*!40000 ALTER TABLE `user_badges` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_badges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_notifications`
--

DROP TABLE IF EXISTS `user_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_app',
  `severity` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL,
  `idempotency_key` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `failed_at` timestamp NULL DEFAULT NULL,
  `last_error` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attempts` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_notifications_idempotency_key_unique` (`idempotency_key`),
  KEY `user_notifications_user_id_type_created_at_index` (`user_id`,`type`,`created_at`),
  KEY `user_notifications_user_id_read_at_index` (`user_id`,`read_at`),
  KEY `user_notifications_channel_created_at_index` (`channel`,`created_at`),
  CONSTRAINT `user_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_notifications`
--

LOCK TABLES `user_notifications` WRITE;
/*!40000 ALTER TABLE `user_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `firstName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phoneNumber` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approval_status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'approved',
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approval_notes` text COLLATE utf8mb4_unicode_ci,
  `organization` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_proof_document` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `areaOfResponsibility` text COLLATE utf8mb4_unicode_ci,
  `profile_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expo_push_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `push_token_platform` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `push_token_app_version` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `push_token_updated_at` timestamp NULL DEFAULT NULL,
  `push_notifications_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `push_pref_report_updates` tinyint(1) NOT NULL DEFAULT '1',
  `push_pref_event_reminders` tinyint(1) NOT NULL DEFAULT '1',
  `push_pref_achievements` tinyint(1) NOT NULL DEFAULT '0',
  `push_quiet_hours_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `push_quiet_hours_start` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `push_quiet_hours_end` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `bbox_south` double DEFAULT NULL,
  `bbox_north` double DEFAULT NULL,
  `bbox_west` double DEFAULT NULL,
  `bbox_east` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_approved_by_foreign` (`approved_by`),
  KEY `users_approval_status_index` (`approval_status`),
  CONSTRAINT `users_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (5,'Admin','Admin','admin@admin.com','$2y$12$qumuggX/6J67PdfX6q4auuq23Qc.W9IqU8KKl34BSBl8RHz4sPbva','9224761639','admin','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,1,0,0,NULL,NULL,NULL,'2026-05-08 05:47:57','2026-05-08 05:47:57',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-08 21:57:31
