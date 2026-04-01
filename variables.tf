variable "aws_region" {
  description = "Primary AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Prefix used for all resource names"
  type        = string
  default     = "q-atelier"
}

variable "domain_name" {
  description = "The domain name for the site (e.g. q-atelier.nl)"
  type        = string
}

variable "owner_email" {
  description = "Owner's email address for booking notifications"
  type        = string
  sensitive   = true
}

variable "resend_api_key" {
  description = "Resend API key for sending emails"
  type        = string
  sensitive   = true
}
