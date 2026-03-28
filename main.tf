terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Populated after running bootstrap/
    # Fill in after bootstrap apply outputs
    bucket         = "" # e.g. "q-atelier-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "" # e.g. "eu-west-1"
    dynamodb_table = "" # e.g. "q-atelier-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# ACM certs for CloudFront must be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "hosting" {
  source       = "./modules/hosting"
  project_name = var.project_name
  domain_name  = var.domain_name

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

module "database" {
  source       = "./modules/database"
  project_name = var.project_name
}

module "notifications" {
  source             = "./modules/notifications"
  project_name       = var.project_name
  sibel_email        = var.sibel_email
  sibel_phone        = var.sibel_phone
  ses_from_email     = var.ses_from_email
}

module "api" {
  source             = "./modules/api"
  project_name       = var.project_name
  bookings_table_arn = module.database.bookings_table_arn
  bookings_table_name = module.database.bookings_table_name
  ses_topic_arn      = module.notifications.ses_topic_arn
  sns_topic_arn      = module.notifications.sns_topic_arn
  sibel_email        = var.sibel_email
  ses_from_email     = var.ses_from_email
}
