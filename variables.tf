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

variable "sibel_email" {
  description = "Sibel's Gmail address for booking notifications"
  type        = string
  sensitive   = true
}

variable "sibel_phone" {
  description = "Sibel's phone number for SMS notifications (+31...)"
  type        = string
  sensitive   = true
}

variable "ses_from_email" {
  description = "Verified SES sender address (e.g. info@q-atelier.nl or q.atelier89@gmail.com)"
  type        = string
  sensitive   = true
}
